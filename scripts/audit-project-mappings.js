/**
 * Project Mapping Audit Script
 * 
 * This script compares Clockify and Zoho project lists to:
 * 1. Identify orphaned projects (exist in one system but not the other)
 * 2. Find archived projects that are still referenced
 * 3. Detect naming inconsistencies
 * 4. Generate a report for cleanup actions
 * 
 * Usage:
 *   node scripts/audit-project-mappings.js
 */

const fs = require('fs');
const path = require('path');

// Mock the project mapping service functionality for Node.js
async function auditProjectMappings() {
  console.log('🔍 Starting Project Mapping Audit...\n');
  
  try {
    // Import the services
    const { clockifyService } = require('../lib/clockify.ts');
    const { zohoService } = require('../lib/zoho.ts');
    
    console.log('📊 Fetching projects from Clockify and Zoho...');
    
    // Fetch projects from both services
    const [clockifyProjects, zohoProjects] = await Promise.allSettled([
      clockifyService.getProjects(),
      zohoService.getProjects()
    ]);

    const clockifyData = clockifyProjects.status === 'fulfilled' ? clockifyProjects.value : [];
    const zohoData = zohoProjects.status === 'fulfilled' ? zohoProjects.value : [];

    console.log(`✅ Fetched ${clockifyData.length} Clockify projects`);
    console.log(`✅ Fetched ${zohoData.length} Zoho projects\n`);

    // Generate the audit report
    const report = generateAuditReport(clockifyData, zohoData);
    
    // Display the report
    displayReport(report);
    
    // Save report to file
    saveReport(report);
    
    // Return exit code based on findings
    const hasIssues = report.orphanedProjects.length > 0 || 
                      report.namingInconsistencies.length > 0 ||
                      report.archivedButReferenced.length > 0;
    
    if (hasIssues) {
      console.log('\n⚠️ Issues found. Please review the report and take action.');
      process.exit(1);
    } else {
      console.log('\n✅ No issues found. All projects are properly synchronized.');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Error during audit:', error);
    process.exit(1);
  }
}

/**
 * Generate comprehensive audit report
 */
function generateAuditReport(clockifyProjects, zohoProjects) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalClockifyProjects: clockifyProjects.length,
      totalZohoProjects: zohoProjects.length,
      matchedProjects: 0,
      orphanedProjects: 0,
      archivedClockifyProjects: 0,
      archivedZohoProjects: 0,
      namingInconsistencies: 0
    },
    matchedProjects: [],
    orphanedProjects: [],
    clockifyOnlyProjects: [],
    zohoOnlyProjects: [],
    archivedButReferenced: [],
    namingInconsistencies: []
  };

  // Create name-based index for Zoho projects
  const zohoByName = new Map();
  const usedZohoIds = new Set();
  
  zohoProjects.forEach(project => {
    const normalizedName = normalizeName(project.project_name);
    zohoByName.set(normalizedName, project);
  });

  // First pass: Match Clockify projects with Zoho
  clockifyProjects.forEach(clockifyProject => {
    const normalizedClockifyName = normalizeName(clockifyProject.name);
    
    // Try to find matching Zoho project
    let matchingZoho = null;
    let matchScore = 0;
    
    // Exact name match
    if (zohoByName.has(normalizedClockifyName)) {
      matchingZoho = zohoByName.get(normalizedClockifyName);
      matchScore = 1.0;
    } else {
      // Fuzzy match
      for (const [zohoName, zohoProject] of zohoByName.entries()) {
        if (usedZohoIds.has(zohoProject.project_id)) continue;
        
        const similarity = calculateSimilarity(normalizedClockifyName, zohoName);
        if (similarity > matchScore && similarity > 0.8) {
          matchScore = similarity;
          matchingZoho = zohoProject;
        }
      }
    }

    if (matchingZoho) {
      usedZohoIds.add(matchingZoho.project_id);
      
      const match = {
        clockifyId: clockifyProject.id,
        clockifyName: clockifyProject.name,
        zohoId: matchingZoho.project_id,
        zohoName: matchingZoho.project_name,
        matchScore,
        clockifyArchived: clockifyProject.archived || false,
        zohoStatus: matchingZoho.status || 'unknown'
      };
      
      report.matchedProjects.push(match);
      report.summary.matchedProjects++;
      
      // Check for naming inconsistencies
      if (clockifyProject.name !== matchingZoho.project_name) {
        report.namingInconsistencies.push({
          clockifyName: clockifyProject.name,
          zohoName: matchingZoho.project_name,
          matchScore,
          suggestion: 'Consider renaming one to match the other'
        });
        report.summary.namingInconsistencies++;
      }
      
      // Check for archived projects still being referenced
      if (clockifyProject.archived) {
        report.archivedButReferenced.push({
          projectId: clockifyProject.id,
          projectName: clockifyProject.name,
          source: 'clockify',
          suggestion: 'Consider filtering out this archived project from reports'
        });
      }
      
    } else {
      // Clockify-only project
      const orphan = {
        projectId: clockifyProject.id,
        projectName: clockifyProject.name,
        source: 'clockify',
        archived: clockifyProject.archived || false,
        clientName: clockifyProject.clientName || 'Unknown'
      };
      
      if (clockifyProject.archived) {
        report.archivedButReferenced.push({
          ...orphan,
          suggestion: 'Archived project - can be safely ignored or cleaned up'
        });
      } else {
        report.clockifyOnlyProjects.push(orphan);
        report.orphanedProjects.push({
          ...orphan,
          suggestion: 'Create corresponding project in Zoho or mark as archived'
        });
        report.summary.orphanedProjects++;
      }
    }
    
    if (clockifyProject.archived) {
      report.summary.archivedClockifyProjects++;
    }
  });

  // Second pass: Find Zoho-only projects
  zohoProjects.forEach(zohoProject => {
    if (!usedZohoIds.has(zohoProject.project_id)) {
      const isArchived = zohoProject.status?.toLowerCase() === 'inactive' || 
                        zohoProject.status?.toLowerCase() === 'closed';
      
      const orphan = {
        projectId: zohoProject.project_id,
        projectName: zohoProject.project_name,
        source: 'zoho',
        archived: isArchived,
        status: zohoProject.status || 'unknown',
        customerName: zohoProject.customer_name || 'Unknown'
      };
      
      if (isArchived) {
        report.archivedButReferenced.push({
          ...orphan,
          suggestion: 'Archived project - can be safely ignored or cleaned up'
        });
        report.summary.archivedZohoProjects++;
      } else {
        report.zohoOnlyProjects.push(orphan);
        report.orphanedProjects.push({
          ...orphan,
          suggestion: 'Create corresponding project in Clockify or mark as inactive'
        });
        report.summary.orphanedProjects++;
      }
    }
    
    const isArchived = zohoProject.status?.toLowerCase() === 'inactive' || 
                      zohoProject.status?.toLowerCase() === 'closed';
    if (isArchived) {
      report.summary.archivedZohoProjects++;
    }
  });

  return report;
}

/**
 * Display report in console
 */
function displayReport(report) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                  PROJECT MAPPING AUDIT REPORT             ');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('📊 SUMMARY');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`Total Clockify Projects:        ${report.summary.totalClockifyProjects}`);
  console.log(`Total Zoho Projects:            ${report.summary.totalZohoProjects}`);
  console.log(`Matched Projects:               ${report.summary.matchedProjects} ✅`);
  console.log(`Orphaned Projects:              ${report.summary.orphanedProjects} ⚠️`);
  console.log(`Archived Clockify Projects:     ${report.summary.archivedClockifyProjects}`);
  console.log(`Archived Zoho Projects:         ${report.summary.archivedZohoProjects}`);
  console.log(`Naming Inconsistencies:         ${report.summary.namingInconsistencies}`);
  console.log('');

  if (report.orphanedProjects.length > 0) {
    console.log('⚠️  ORPHANED PROJECTS');
    console.log('─────────────────────────────────────────────────────────');
    report.orphanedProjects.forEach((project, index) => {
      console.log(`${index + 1}. [${project.source.toUpperCase()}] ${project.projectName}`);
      console.log(`   ID: ${project.projectId}`);
      console.log(`   Archived: ${project.archived ? 'Yes' : 'No'}`);
      console.log(`   Suggestion: ${project.suggestion}`);
      console.log('');
    });
  }

  if (report.namingInconsistencies.length > 0) {
    console.log('📝 NAMING INCONSISTENCIES');
    console.log('─────────────────────────────────────────────────────────');
    report.namingInconsistencies.forEach((inconsistency, index) => {
      console.log(`${index + 1}. Clockify: "${inconsistency.clockifyName}"`);
      console.log(`   Zoho:     "${inconsistency.zohoName}"`);
      console.log(`   Match Score: ${(inconsistency.matchScore * 100).toFixed(1)}%`);
      console.log(`   Suggestion: ${inconsistency.suggestion}`);
      console.log('');
    });
  }

  if (report.archivedButReferenced.length > 0) {
    console.log('🗄️  ARCHIVED PROJECTS STILL IN SYSTEM');
    console.log('─────────────────────────────────────────────────────────');
    report.archivedButReferenced.forEach((project, index) => {
      console.log(`${index + 1}. [${project.source.toUpperCase()}] ${project.projectName}`);
      console.log(`   ID: ${project.projectId}`);
      console.log(`   Suggestion: ${project.suggestion}`);
      console.log('');
    });
  }

  if (report.matchedProjects.length > 0) {
    console.log(`✅ SUCCESSFULLY MATCHED PROJECTS (${report.matchedProjects.length})`);
    console.log('─────────────────────────────────────────────────────────');
    console.log('(Showing first 10)');
    report.matchedProjects.slice(0, 10).forEach((match, index) => {
      console.log(`${index + 1}. ${match.clockifyName}`);
      console.log(`   Clockify ID: ${match.clockifyId}`);
      console.log(`   Zoho ID: ${match.zohoId}`);
      console.log(`   Match Score: ${(match.matchScore * 100).toFixed(1)}%`);
      console.log('');
    });
    if (report.matchedProjects.length > 10) {
      console.log(`   ... and ${report.matchedProjects.length - 10} more`);
      console.log('');
    }
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}

/**
 * Save report to JSON file
 */
function saveReport(report) {
  const reportDir = path.join(__dirname, '..', 'reports');
  
  // Create reports directory if it doesn't exist
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `project-mapping-audit-${timestamp}.json`;
  const filepath = path.join(reportDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`📁 Report saved to: ${filepath}\n`);
}

/**
 * Normalize project name for comparison
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Run the audit
if (require.main === module) {
  auditProjectMappings().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { auditProjectMappings, generateAuditReport };

