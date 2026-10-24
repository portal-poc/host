import { useSuspenseQuery } from '@tanstack/react-query';
import type { MouseEvent } from 'react';
import { Link, List, ListItem, Typography } from '@portal-poc/ds';
import { getHostHttp } from '@/shared/api';
import { useHostNavigate } from '@/shared/lib';
import { bookmarksOptions } from '../api/bookmarks';
import type { Bookmark } from '../api/bookmarks';

const BookmarkLink = ({ bookmark }: { bookmark: Bookmark }) => {
  const navigate = useHostNavigate();
  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    navigate(bookmark.path);
  };
  return (
    <Link href={bookmark.path} onClick={handleClick}>
      {bookmark.title}
    </Link>
  );
};

export const BookmarksWidget = () => {
  const http = getHostHttp();
  const { data } = useSuspenseQuery(bookmarksOptions(http));

  if (data.length === 0) {
    return <Typography level="body-sm">No bookmarks yet — add one in Tasks (☆).</Typography>;
  }
  return (
    <List>
      {data.map((bookmark) => (
        <ListItem key={bookmark.taskId}>
          <BookmarkLink bookmark={bookmark} />
        </ListItem>
      ))}
    </List>
  );
};
