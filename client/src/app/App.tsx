import { Route, Routes } from 'react-router-dom';
import { AuthPage } from '../features/auth/AuthPage';
import { DocumentEditPage } from '../features/document-edit/DocumentEditPage';
import { DocumentViewPage } from '../features/document-view/DocumentViewPage';
import { DocumentsPage } from '../features/documents/DocumentsPage';
import { HomePage } from '../features/home/HomePage';
import { NotFoundPage } from '../features/not-found/NotFoundPage';
import { ProfileRoute } from '../features/profile/ProfilePage';
import { PublicDocPage } from '../features/public-doc/PublicDocPage';
import { SearchPage } from '../features/search/SearchPage';
import { AppShell } from './shell/AppShell';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/docs" element={<DocumentsPage />} />
        <Route path="/docs/:id" element={<DocumentViewPage />} />
        <Route path="/docs/:id/edit" element={<DocumentEditPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/p/:token" element={<PublicDocPage />} />
        <Route path="/login" element={<AuthPage key="login" mode="login" />} />
        <Route path="/register" element={<AuthPage key="register" mode="register" />} />
        <Route path="/:handle" element={<ProfileRoute />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}
