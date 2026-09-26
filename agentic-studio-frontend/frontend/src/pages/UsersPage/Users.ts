
export interface User {
    id: number;
    email: string;
    name: string;
    picture: string;
    role: string;
    is_active: boolean;
    is_admin: boolean;
    avatar: string | null;
    preferences: any | null;
    client_id: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface UserCreate {
    name: string;
    email: string;
    role: string;
  }
  
  export interface NewUserResponse{
    message: string;
    user: User;
  }

  export interface UseLazyAvatarOptions {
    fallbackSrc: string;
    rootMargin?: string;
    threshold?: number;
  }

  export interface UserTableRowProps {
    user: User;
  }

  export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    startIndex: number;
    endIndex: number;
    totalItems: number;
    onPrevious: () => void;
    onNext: () => void;
    onPageChange: (page: number) => void;
  }