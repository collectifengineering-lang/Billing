'use client';

import { Card, Metric, Text, BadgeDelta, Flex } from '@tremor/react';

interface KPIData {
  title: string;
  metric: string;
  delta: string;
  deltaType: 'increase' | 'decrease' | 'unchanged';
  description: string;
}

interface TremorKPICardsProps {
  data: KPIData[];
}

export default function TremorKPICards({ data }: TremorKPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {data.map((item, index) => (
        <Card key={index} className="max-w-xs mx-auto">
          <Flex alignItems="start">
            <div>
              <Text>{item.title}</Text>
              <Metric>{item.metric}</Metric>
            </div>
            <BadgeDelta deltaType={item.deltaType} size="xs">
              {item.delta}
            </BadgeDelta>
          </Flex>
          <Text className="mt-4">{item.description}</Text>
        </Card>
      ))}
    </div>
  );
}
