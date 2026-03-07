import { CONSTANTS } from '../utils/constants';

export interface PicsumPhoto {
  id: string;
  author: string;
  width: number;
  height: number;
  url: string;
  download_url: string;
}

export const fetchPhotos = async (
  page: number,
  limit = CONSTANTS.FEED_ITEMS_LIMIT,
): Promise<PicsumPhoto[]> => {
  const res = await fetch(
    `https://picsum.photos/v2/list?page=${page}&limit=${limit}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch photos: ${res.status}`);
  return res.json();
};

export interface DummyComment {
  id: number;
  body: string;
  postId: number;
  likes: number;
  user: {
    id: number;
    username: string;
    fullName: string;
  };
}

export interface DummyCommentsResponse {
  comments: DummyComment[];
  total: number;
  skip: number;
  limit: number;
}

export const fetchComments = async (
  skip: number,
  limit = CONSTANTS.MESSAGES_LIMIT,
): Promise<DummyCommentsResponse> => {
  const res = await fetch(
    `https://dummyjson.com/comments?limit=${limit}&skip=${skip}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch comments: ${res.status}`);
  return res.json();
};
