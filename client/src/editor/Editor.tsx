import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

// Debounced autosave: no request per keystroke. Shows Saving... / Saved.
export default function Editor({ id, initial }: { id: string; initial: any }) {
  const [status, setStatus] = useState('Saved');
  const [uploading, setUploading] = useState(false);
  const timer = useRef<any>(null);
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link,
      Image,
    ],
    content: initial ?? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
    onUpdate: ({ editor }) => {
      setStatus('Saving...');
      clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const json = editor.getJSON();
        const text = editor.getText().slice(0, 20000);
        try {
          await api(`/api/documents/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ content: json, content_text: text })
          });
          setStatus('Saved');
        } catch { setStatus('Save failed'); }
      }, 1200);
    }
  });
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleImageUpload = async () => {
    if (!editor) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) {
        alert('Arquivo muito grande (máx. 25MB)');
        return;
      }
      setUploading(true);
      try {
        // 1. Get presigned upload URL
        const { uploadUrl, publicUrl } = await api<any>(
          `/api/documents/${id}/attachments/upload-url`,
          {
            method: 'POST',
            body: JSON.stringify({
              filename: file.name,
              mime: file.type,
              size: file.size
            })
          }
        );
        // 2. Upload directly to S3/R2
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
        if (!putRes.ok) throw new Error('Upload failed');
        // 3. Insert image into editor using the public URL
        editor.chain().focus().setImage({ src: publicUrl }).run();
        setStatus('Saved');
      } catch (e) {
        console.error(e);
        alert('Falha no upload da imagem');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  if (!editor) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xs text-neutral-500">{status}</div>
        {uploading && <span className="text-xs text-blue-600">Enviando imagem…</span>}
        <button
          type="button"
          onClick={handleImageUpload}
          disabled={uploading}
          className="text-sm px-2 py-1 border rounded hover:bg-neutral-100 disabled:opacity-50"
          title="Inserir imagem"
        >
          🖼️ Imagem
        </button>
      </div>
      <div className="prose-editor bg-white rounded border border-neutral-200 p-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
