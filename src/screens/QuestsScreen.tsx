import React from 'react';

import {
  EmptyState,
  PrimaryButton,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/shared/components/ui';

const QuestsScreen = () => {
  const [hasDraftTask, setHasDraftTask] = React.useState(false);

  return (
    <ScreenContainer centered>
      <SectionHeader
        title="Quests"
        subtitle="Generated quests will appear here after AI processing."
      />

      <StatCard title="Quest Queue" subtitle="Current status">
        <EmptyState
          title="No active quests yet"
          description="Add a task and AI will generate a quest."
        />
      </StatCard>

      <PrimaryButton label="Add task" onPress={() => setHasDraftTask(true)} />

      {hasDraftTask ? (
        <EmptyState
          title="Draft task added"
          description="AI quest creation is ready to be connected in the next step."
        />
      ) : null}
    </ScreenContainer>
  );
};

export default QuestsScreen;
