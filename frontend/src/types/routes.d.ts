// types/routes.d.ts
declare module 'react-router-dom' {
  export interface PathParams {
    domain?: 'educatif' | 'professionnel';
    level?: string;
    subject?: string;
  }
}