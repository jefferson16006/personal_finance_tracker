export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface JWTInterface {
  userId: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

 export interface CreatedUserResponse {
  user_id: string;
  name: string;
  email: string;
  created_at: Date;
}

export interface CreatedCategoryResponse {
  name: string;
  type: string;
}