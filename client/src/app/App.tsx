import { Suspense, lazy, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../auth/store';
import { renderNode, toMarkdown } from '../documents/render';

const Editor = lazy(() => import('../editor/Editor'));

function Nav() {
  const { username, logout } = useAuth();
  const [q, setQ] = useState('');
  const nav = useNavigate();
  return (
    <nav className="flex items-center gap-4 px-6 py-3 border-b bg-white">
      <Link to="/" className="font-semibold">CZAR DOCUMENTS</Link>
      <Link to="/docs">Documents</Link>
      <Link to="/search">Search</Link>
      <form onSubmit={(e) => { e.preventDefault(); nav('/search?q=' + encodeURIComponent(q)); }} className="ml-auto flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="border rounded px-2 py-1 text-sm" />
      </form>
      {username ? (<><Link to={'/@' + username}>@{username}</Link><button onClick={logout} className="text-sm">Logout</button></>)
        : (<><Link to="/login">Login</Link><Link to="/register">Register</Link></>)}
    </nav>
  );
}

function Home() {
  return <div className="p-8 max-w-2xl"><h1 className="text-3xl font-semibold mb-2">Write. Organize. Collaborate. Publish. Search.</h1>
    <p className="text-neutral-600">Content first. Minimal UI. Fast interaction.</p></div>;
}

function Docs() {
  const qc = useQueryClient();
  const { data: docs } = useQuery({ queryKey: ['docs'], queryFn: () => api<any[]>('/api/documents') });
  const { data: types } = useQuery({ queryKey: ['doctypes'], queryFn: () => api<any[]>('/api/document-types') });
  // Flat folder list (BFS over lazy levels) for move dropdowns.
  const { data: allFolders } = useQuery({
    queryKey: ['allFolders'],
    queryFn: async () => {
      const out: any[] = [];
      let queue: (string | null)[] = [null];
      while (queue.length) {
        const parent = queue.shift()!;
        const kids: any[] = await api(`/api/folders${parent ? `?parent_id=${parent}` : ''}`);
        for (const k of kids) { out.push({ ...k, parent_id: parent }); queue.push(k.id); }
      }
      return out;
    },
  });
  const [title, setTitle] = useState('');
  const [selFolder, setSelFolder] = useState<string | null>(null); // null = all
  const [selType, setSelType] = useState(''); // slug or '' = all
  const [newDocFolder, setNewDocFolder] = useState('');
  const [newDocType, setNewDocType] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const nav = useNavigate();
  const refreshFolders = () => { qc.invalidateQueries({ queryKey: ['folders'] }); qc.invalidateQueries({ queryKey: ['allFolders'] }); };
  const filtered = (docs || []).filter((d: any) =>
    (selFolder === null || (d.folder_id ?? null) === selFolder) &&
    (selType === '' || d.type_slug === selType));
  const moveDoc = async (id: string, folder_id: string) => {
    await api(`/api/documents/${id}`, { method: 'PATCH', body: JSON.stringify({ folder_id }) });
    qc.invalidateQueries({ queryKey: ['docs'] });
  };
  return <div className="p-6 max-w-5xl flex gap-6">
    <aside className="w-56 shrink-0">
      <h3 className="text-sm font-semibold text-neutral-500 mb-2">FOLDERS</h3>
      <button onClick={() => setSelFolder(null)} className={`block text-sm px-2 py-1 rounded w-full text-left ${selFolder === null ? 'bg-neutral-900 text-white' : ''}`}>All documents</button>
      <button onClick={() => setSelFolder('__none__')} className={`block text-sm px-2 py-1 rounded w-full text-left ${selFolder === '__none__' ? 'bg-neutral-900 text-white' : ''}`}>No folder</button>
      <FolderTree selected={selFolder} onSelect={setSelFolder} onChanged={refreshFolders} />
      <form className="flex gap-1 mt-3" onSubmit={async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        await api('/api/folders', { method: 'POST', body: JSON.stringify({ name: newFolderName.trim(), parent_id: selFolder && selFolder !== '__none__' ? selFolder : undefined }) });
        setNewFolderName(''); refreshFolders();
      }}>
        <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="New folder..." className="border rounded px-2 py-1 text-sm flex-1 min-w-0" />
        <button className="border rounded px-2 text-sm">+</button>
      </form>
      <h3 className="text-sm font-semibold text-neutral-500 mt-5 mb-2">TYPE</h3>
      <select value={selType} onChange={(e) => setSelType(e.target.value)} className="border rounded px-2 py-1 text-sm w-full">
        <option value="">All types</option>
        {(types || []).map((t: any) => <option key={t.id} value={t.slug}>{t.icon} {t.name}</option>)}
      </select>
    </aside>
    <div className="flex-1 min-w-0">
      <form className="flex gap-2 mb-4" onSubmit={async (e) => {
        e.preventDefault();
        const r = await api<{ id: string }>('/api/documents', { method: 'POST', body: JSON.stringify({ title: title || 'Untitled', folder_id: newDocFolder || undefined, document_type_id: newDocType || undefined }) });
        qc.invalidateQueries({ queryKey: ['docs'] });
        nav('/docs/' + r.id + '/edit');
      }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New document title..." className="border rounded px-2 py-1 flex-1" />
        <select value={newDocFolder} onChange={(e) => setNewDocFolder(e.target.value)} className="border rounded px-1 text-sm max-w-32">
          <option value="">No folder</option>
          {(allFolders || []).map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select value={newDocType} onChange={(e) => setNewDocType(e.target.value)} className="border rounded px-1 text-sm max-w-32">
          <option value="">No type</option>
          {(types || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button className="border rounded px-3">Create</button>
      </form>
      {filtered.map((d: any) => (
        <div key={d.id} className="py-2 border-b flex gap-3 items-center">
          <Link to={'/docs/' + d.id} className="font-medium truncate">{d.title}</Link>
          <span className="text-xs text-neutral-500">{d.visibility}{d.type_slug ? ` · ${d.type_slug}` : ''}</span>
          <select value={d.folder_id ?? ''} onChange={(e) => moveDoc(d.id, e.target.value)} className="border rounded text-xs px-1 py-0.5 ml-auto" title="Move to folder">
            <option value="">No folder</option>
            {(allFolders || []).map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <Link to={'/docs/' + d.id + '/edit'} className="text-sm">Edit</Link>
        </div>))}
      {filtered.length === 0 && <p className="text-sm text-neutral-500 mt-4">No documents here. Create one above.</p>}
    </div>
  </div>;
}

// Lazy-load 1 level at a time; children fetched only on expand.
function FolderTree({ selected, onSelect, onChanged, parent = null, depth = 0 }: { selected: string | null; onSelect: (id: string | null) => void; onChanged: () => void; parent?: string | null; depth?: number }) {
  const { data } = useQuery({ queryKey: ['folders', parent ?? 'root'], queryFn: () => api<any[]>(`/api/folders${parent ? `?parent_id=${parent}` : ''}`) });
  if (!data || data.length === 0) return null;
  return <div>{data.map((f: any) => <FolderNode key={f.id} folder={f} depth={depth} selected={selected} onSelect={onSelect} onChanged={onChanged} />)}</div>;
}

function FolderNode({ folder, depth, selected, onSelect, onChanged }: { folder: any; depth: number; selected: string | null; onSelect: (id: string | null) => void; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  return <div>
    <div className="flex items-center gap-1">
      <button onClick={() => setOpen(!open)} className="text-xs w-4 text-neutral-400">{open ? '▾' : '▸'}</button>
      <button onClick={() => onSelect(folder.id)} className={`flex-1 text-left text-sm px-2 py-1 rounded truncate ${selected === folder.id ? 'bg-neutral-900 text-white' : ''}`} style={{ marginLeft: depth * 8 }}>{folder.name}</button>
    </div>
    {open && <div className="ml-4"><FolderTree selected={selected} onSelect={onSelect} onChanged={onChanged} parent={folder.id} depth={depth + 1} /></div>}
  </div>;
}

function TypeSelector({ docId, value, onChanged }: { docId: string; value: string | null; onChanged: () => void }) {
  const qc = useQueryClient();
  const { data: types } = useQuery({ queryKey: ['doctypes'], queryFn: () => api<any[]>('/api/document-types') });
  const [newType, setNewType] = useState('');
  return <div className="flex gap-2 items-center flex-wrap">
    <select value={value ?? ''} onChange={async (e) => {
      await api(`/api/documents/${docId}`, { method: 'PATCH', body: JSON.stringify({ document_type_id: e.target.value }) });
      onChanged(); qc.invalidateQueries({ queryKey: ['docs'] });
    }} className="border rounded px-2 py-1 text-sm">
      <option value="">No type</option>
      {(types || []).map((t: any) => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
    </select>
    <form className="flex gap-1" onSubmit={async (e) => {
      e.preventDefault();
      if (!newType.trim()) return;
      const r = await api<{ id: string }>('/api/document-types', { method: 'POST', body: JSON.stringify({ name: newType.trim() }) });
      await api(`/api/documents/${docId}`, { method: 'PATCH', body: JSON.stringify({ document_type_id: r.id }) });
      setNewType(''); onChanged(); qc.invalidateQueries({ queryKey: ['doctypes'] }); qc.invalidateQueries({ queryKey: ['docs'] });
    }}>
      <input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="New type..." className="border rounded px-2 py-1 text-sm w-28" />
      <button className="border rounded px-2 text-sm">+</button>
    </form>
  </div>;
}

function DocView() {
  const { id } = useParams();
  const { data } = useQuery({ queryKey: ['doc', id], queryFn: () => api<any>('/api/documents/' + id) });
  if (!data) return null;
  const isOwner = data.role === 'owner';
  return <div className="p-6 max-w-3xl">
    <h1 className="text-3xl font-semibold">{data.title}</h1>
    <div className="flex gap-2 my-3">
      <Link to={'/docs/' + id + '/edit'} className="border rounded px-3 py-1 text-sm">Edit</Link>
      <button className="border rounded px-3 py-1 text-sm" onClick={() => {
        const md = toMarkdown(data.content);
        const blob = new Blob([`# ${data.title}\n\n${md}`], { type: 'text/markdown' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${data.title || 'document'}.md`;
        a.click();
        URL.revokeObjectURL(a.href);
      }}>Export .md</button>
    </div>
    <div className="prose-view bg-white border rounded p-6" dangerouslySetInnerHTML={{ __html: renderNode(data.content) }} />
    {isOwner ? <ShareDialog docId={id!} /> : <p className="text-xs text-neutral-500 mt-4">Shared with you as {data.role}.</p>}
  </div>;
}

// Owner-only: list/add/change-role/remove collaborators + publish/revoke.
function ShareDialog({ docId }: { docId: string }) {
  const qc = useQueryClient();
  const { data: shares } = useQuery({ queryKey: ['shares', docId], queryFn: () => api<any[]>(`/api/documents/${docId}/shares`), retry: false });
  const [name, setName] = useState('');
  const [role, setRole] = useState('editor');
  const [pubUrl, setPubUrl] = useState<string | null>(null);
  if (shares === undefined) return null; // not owner or loading: hide dialog
  const refresh = () => qc.invalidateQueries({ queryKey: ['shares', docId] });
  return <div className="mt-6 border rounded p-4 bg-neutral-50">
    <h3 className="font-semibold text-sm mb-2">Share</h3>
    {(shares || []).map((s: any) => (
      <div key={s.user_id} className="flex items-center gap-2 py-1 text-sm">
        <span className="font-medium">@{s.username}</span>
        <select value={s.role} onChange={async (e) => {
          await api(`/api/documents/${docId}/shares`, { method: 'POST', body: JSON.stringify({ username: s.username, role: e.target.value }) });
          refresh();
        }} className="border rounded px-1 py-0.5 text-xs">
          <option value="editor">editor</option>
          <option value="viewer">viewer</option>
        </select>
        <button onClick={async () => { await api(`/api/documents/${docId}/shares/${s.user_id}`, { method: 'DELETE' }); refresh(); }} className="text-xs text-red-600 ml-auto">Remove</button>
      </div>))}
    <form className="flex gap-2 mt-3" onSubmit={async (e) => {
      e.preventDefault();
      if (!name.trim()) return;
      await api(`/api/documents/${docId}/shares`, { method: 'POST', body: JSON.stringify({ username: name.trim(), role }) });
      setName(''); refresh();
    }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="@username or email" className="border rounded px-2 py-1 text-sm flex-1" />
      <select value={role} onChange={(e) => setRole(e.target.value)} className="border rounded px-1 text-sm">
        <option value="editor">editor</option>
        <option value="viewer">viewer</option>
      </select>
      <button className="border rounded px-3 text-sm">Add</button>
    </form>
    <h3 className="font-semibold text-sm mt-4 mb-2">Publish</h3>
    <div className="flex gap-2 items-center">
      <button className="border rounded px-3 py-1 text-sm" onClick={async () => {
        const r = await api<any>(`/api/documents/${docId}/public-link`, { method: 'POST', body: JSON.stringify({ show_on_profile: true }) });
        setPubUrl('/p/' + r.token);
      }}>Publish / update link</button>
      <button className="border rounded px-3 py-1 text-sm" onClick={async () => {
        await api(`/api/documents/${docId}/public-link`, { method: 'DELETE' });
        setPubUrl(null);
      }}>Revoke</button>
    </div>
    {pubUrl && <p className="text-sm mt-2">Public URL: <Link to={pubUrl} className="underline">{pubUrl}</Link></p>}
  </div>;
}

function DocEdit() {
  const { id } = useParams();
  const { data, refetch } = useQuery({ queryKey: ['doc', id], queryFn: () => api<any>('/api/documents/' + id) });
  if (!data) return null;
  return <div className="p-6 max-w-3xl">
    <div className="flex items-center gap-3 mb-3"><h1 className="text-2xl font-semibold">{data.title}</h1>
      <Link to={'/docs/' + id} className="text-sm border rounded px-2 py-1">View</Link></div>
    <div className="mb-3"><TypeSelector docId={id!} value={data.document_type_id ?? null} onChanged={() => refetch()} /></div>
    <Suspense fallback={<div>Loading editor...</div>}><Editor id={id!} initial={data.content} /></Suspense>
  </div>;
}

function SearchPage() {
  const q = new URLSearchParams(location.search).get('q') || '';
  const { data } = useQuery({ queryKey: ['search', q], queryFn: () => api<any>('/api/search?q=' + encodeURIComponent(q)), enabled: !!q });
  return <div className="p-6 max-w-3xl"><h2 className="font-semibold mb-3">Results for “{q}”</h2>
    <h3 className="text-sm text-neutral-500">Documents</h3>
    {(data?.documents || []).map((d: any) => <div key={d.id}><Link to={'/docs/' + d.id}>{d.title}</Link></div>)}
    <h3 className="text-sm text-neutral-500 mt-4">Users</h3>
    {(data?.users || []).map((u: any) => <div key={u.username}><Link to={'/@' + u.username}>@{u.username}</Link></div>)}
  </div>;
}

function Profile() {
  const { username } = useParams();
  const { data } = useQuery({ queryKey: ['profile', username], queryFn: () => api<any>('/api/@' + username) });
  if (!data) return null;
  return <div className="p-6 max-w-2xl"><h1 className="text-2xl font-semibold">@{username}</h1>
    <p className="text-neutral-600">{data.bio}</p>
    {(data.documents || []).map((d: any) => <div key={d.token}><Link to={'/p/' + d.token}>{d.title}</Link></div>)}
  </div>;
}

function PublicDoc() {
  const { token } = useParams();
  const { data } = useQuery({ queryKey: ['pub', token], queryFn: () => api<any>('/api/p/' + token) });
  if (!data) return null;
  return <div className="p-6 max-w-3xl"><h1 className="text-3xl font-semibold">{data.title}</h1>
    <div className="text-sm text-neutral-500">by @{data.author}</div>
    <div className="prose-view mt-4" dangerouslySetInnerHTML={{ __html: renderNode(typeof data.content === 'string' ? JSON.parse(data.content) : data.content) }} /></div>;
}

function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [a, setA] = useState(''); const [b, setB] = useState(''); const [c, setC] = useState('');
  const { login } = useAuth(); const nav = useNavigate();
  return <form className="p-6 max-w-sm flex flex-col gap-2" onSubmit={async (e) => {
    e.preventDefault();
    const r = mode === 'login'
      ? await api<any>('/api/auth/login', { method: 'POST', body: JSON.stringify({ login: a, password: b }) })
      : await api<any>('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: a, email: b, password: c }) });
    login(r.username, r.token); nav('/docs');
  }}>
    <input value={a} onChange={(e) => setA(e.target.value)} placeholder={mode === 'login' ? 'username or email' : 'username'} className="border rounded px-2 py-1" />
    {mode === 'login'
      ? <input type="password" value={b} onChange={(e) => setB(e.target.value)} placeholder="password" className="border rounded px-2 py-1" />
      : <><input value={b} onChange={(e) => setB(e.target.value)} placeholder="email" className="border rounded px-2 py-1" />
         <input type="password" value={c} onChange={(e) => setC(e.target.value)} placeholder="password (8+)" className="border rounded px-2 py-1" /></>}
    <button className="border rounded px-3 py-1">{mode === 'login' ? 'Login' : 'Register'}</button>
  </form>;
}

export default function App() {
  return <>
    <Nav />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/docs/:id" element={<DocView />} />
      <Route path="/docs/:id/edit" element={<DocEdit />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/p/:token" element={<PublicDoc />} />
      <Route path="/@:username" element={<Profile />} />
      <Route path="/login" element={<AuthForm mode="login" />} />
      <Route path="/register" element={<AuthForm mode="register" />} />
    </Routes>
  </>;
}
