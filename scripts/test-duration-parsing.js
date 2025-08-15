// Test the duration parsing function
function parseDuration(duration) {
  if (!duration) return 0;
  
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = duration.match(regex);
  
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours + (minutes / 60) + (seconds / 3600);
}

console.log('🧪 Testing duration parsing function...\n');

const testDurations = [
  'PT0H0M',
  'PT1H0M',
  'PT2H30M',
  'PT0H45M',
  'PT8H0M',
  'PT1H30M',
  'PT0H15M',
  'PT12H0M'
];

testDurations.forEach(duration => {
  const hours = parseDuration(duration);
  console.log(`${duration} → ${hours.toFixed(2)} hours`);
});

console.log('\n📊 Summary:');
const totalHours = testDurations.reduce((sum, duration) => sum + parseDuration(duration), 0);
console.log(`Total hours: ${totalHours.toFixed(2)}`);
console.log(`Average hours: ${(totalHours / testDurations.length).toFixed(2)}`);
