export interface Review {
  id: string;
  projectId: string;
  projectName: string;
  userAddress: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  category: string;
  description: string;
  rating: number;
  reviews: number;
}
