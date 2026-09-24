import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { Button, Spinner } from '../ui';
import { SaveStatus, type SaveState } from './SaveStatus';

// Debounced autosave: no request per keystroke. Shows Saving... / Saved.
export default function Editor({ id, initial }: { id: string; initial: any }) {
  const [status, setStatus] = useState<SaveState>('saved');
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
    editorProps: { attributes: { 'aria-label': 'Document content' } },
    onUpdate: ({ editor }) => {
      setStatus('saving');
      clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const json = editor.getJSON();
        const text = editor.getText().slice(0, 20000);
        try {
          await api(`/api/documents/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ content: json, content_text: text })
          });
          setStatus('saved');
        } catch { setStatus('failed'); }
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
        setStatus('saved');
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
    <div className="rounded-lg border border-border bg-surface shadow-card">
      <div
        role="toolbar"
        aria-label="Editor tools"
        className="sticky top-nav z-dropdown flex min-h-11 flex-wrap items-center gap-2 rounded-t-lg border-b border-border bg-surface-secondary px-2 py-1.5 sm:px-3"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon="image"
          onClick={handleImageUpload}
          disabled={uploading}
          title="Inserir imagem"
        >
          Imagem
        </Button>
        {uploading && (
          <span className="inline-flex items-center gap-1.5 text-small text-info" role="status">
            <Spinner size={14} />
            Enviando imagem…
          </span>
        )}
        <div className="ml-auto pr-1">
          <SaveStatus status={status} />
        </div>
      </div>
      <div className="prose-editor px-5 py-6 sm:px-10 sm:py-10">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
