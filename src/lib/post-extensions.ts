import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";

/**
 * Bộ extension Tiptap dùng CHUNG cho trình soạn bài (trình duyệt) và khi xuất HTML (server),
 * để nội dung lưu ra và hiển thị luôn khớp nhau.
 */
export const postExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    code: false,
    codeBlock: false,
    horizontalRule: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      protocols: ["http", "https", "mailto", "tel"],
    },
  }),
  Image.configure({ inline: false, allowBase64: false }),
];
