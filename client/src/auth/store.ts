import { create } from 'zustand';

type Auth = { username: string | null; login: (u: string, t: string) => void; logout: () => void };
export const useAuth = create<Auth>((set) => ({
  username: localStorage.getItem('db_user'),
  login: (u, t) => { localStorage.setItem('db_token', t); localStorage.setItem('db_user', u); set({ username: u }); },
  logout: () => { localStorage.removeItem('db_token'); localStorage.removeItem('db_user'); set({ username: null }); }
}));
