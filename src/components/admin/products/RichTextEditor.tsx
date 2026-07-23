'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  LinkIcon,
  Undo,
  Redo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Write a detailed product description...',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable Link from StarterKit since we're adding it separately
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-amber-600 underline',
        },
      }),
    ],
    content,
    immediatelyRender: false, // Fix for Next.js SSR
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('Enter URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const MenuButton = ({
    onClick,
    active,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded hover:bg-gray-100 transition-colors ${
        active ? 'bg-amber-100 text-amber-700' : 'text-gray-700'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        >
          <Bold className="w-4 h-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        >
          <Italic className="w-4 h-4" />
        </MenuButton>

        <div className="w-px bg-gray-300 mx-1" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="w-4 h-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
        >
          <Heading3 className="w-4 h-4" />
        </MenuButton>

        <div className="w-px bg-gray-300 mx-1" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
        >
          <List className="w-4 h-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
        >
          <ListOrdered className="w-4 h-4" />
        </MenuButton>

        <div className="w-px bg-gray-300 mx-1" />

        <MenuButton onClick={addLink} active={editor.isActive('link')}>
          <LinkIcon className="w-4 h-4" />
        </MenuButton>

        <div className="w-px bg-gray-300 mx-1" />

        <MenuButton onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="w-4 h-4" />
        </MenuButton>

        <MenuButton onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="w-4 h-4" />
        </MenuButton>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {editor.isEmpty && (
        <div className="absolute top-14 left-4 text-gray-400 pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  );
}
