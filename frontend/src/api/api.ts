import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle unauthorized requests
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: number;
  username: string;
  email: string;
  created_at?: string;
}

export interface Group {
  id: number;
  name: string;
  invite_code: string;
  member_count: number;
  is_owner?: boolean;
  created_at?: string;
}

export interface GroupDetail extends Group {
  members: User[];
}

export interface Bet {
  id: number;
  group_id: number;
  description: string;
  deadline: string;
  stake: string;
  status: 'pending' | 'completed' | 'cancelled';
  result?: 'won' | 'lost';
  created_at: string;
  completed_at?: string;
  creator_name?: string;
  is_creator?: boolean;
  total_votes: number;
  potential_voters: number;
  userHasVoted?: boolean;
  userVote?: string;
  emoji?: string;
}

export interface BetDetail extends Bet {
  votes: Array<{
    username: string;
    vote: string;
    voted_at: string;
  }>;
  voteCounts: { [key: string]: number };
}

export interface Comment {
  id: number;
  bet_id: number;
  user_id: number;
  username: string;
  comment: string;
  created_at: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

// Auth API
export const auth = {
  login: (data: LoginData): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/login', data),

  register: (data: RegisterData): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/register', data),

  getProfile: (): Promise<AxiosResponse<{ user: User }>> =>
    api.get('/auth/profile'),

  updateProfile: (data: Partial<User>): Promise<AxiosResponse<{ message: string }>> =>
    api.put('/auth/profile', data),
};

// Groups API
export const groups = {
  getAll: (): Promise<AxiosResponse<{ groups: Group[] }>> =>
    api.get('/groups'),

  create: (data: { name: string }): Promise<AxiosResponse<{ message: string; group: Group }>> =>
    api.post('/groups', data),

  join: (data: { code: string }): Promise<AxiosResponse<{ message: string; group: Group }>> =>
    api.post('/groups/join', data),

  getDetails: (groupId: number): Promise<AxiosResponse<{ group: GroupDetail }>> =>
    api.get(`/groups/${groupId}`),

  leave: (groupId: number): Promise<AxiosResponse<{ message: string }>> =>
    api.post(`/groups/${groupId}/leave`),

  delete: (groupId: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/groups/${groupId}`),
};

// Bets API
export const bets = {
  create: (data: {
    groupId: number;
    description: string;
    deadline: string;
    stake: string;
    emoji?: string;
  }): Promise<AxiosResponse<{ message: string; bet: Bet }>> =>
    api.post('/bets', data),

  vote: (betId: number, data: { vote: string }): Promise<AxiosResponse<{ message: string; vote: string }>> =>
    api.post(`/bets/${betId}/vote`, data),

  getForGroup: (groupId: number): Promise<AxiosResponse<{ bets: Bet[] }>> =>
    api.get(`/bets/group/${groupId}`),

  getDetails: (betId: number): Promise<AxiosResponse<{ bet: BetDetail }>> =>
    api.get(`/bets/${betId}`),

  resolve: (betId: number, data: { result: 'won' | 'lost' }): Promise<AxiosResponse<{ message: string; result: string }>> =>
    api.post(`/bets/${betId}/resolve`, data),

  getComments: (betId: number): Promise<AxiosResponse<{ comments: Comment[] }>> =>
    api.get(`/bets/${betId}/comments`),

  createComment: (betId: number, data: { comment: string }): Promise<AxiosResponse<{ message: string; comment: Comment }>> =>
    api.post(`/bets/${betId}/comments`, data),
};

export default api;
