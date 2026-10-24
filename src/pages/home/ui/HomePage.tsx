import { Card, Stack, Typography } from '@portal-poc/ds';
import { QueryBoundary } from '@/shared/ui';
import { BookmarksWidget } from './BookmarksWidget';

export const HomePage = () => (
  <Stack gap={2}>
    <Typography level="h3">Home</Typography>
    <Card sx={{ maxWidth: 480 }}>
      <Typography level="title-md">Bookmarks</Typography>
      <QueryBoundary>
        <BookmarksWidget />
      </QueryBoundary>
    </Card>
  </Stack>
);
