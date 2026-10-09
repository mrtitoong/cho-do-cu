import { generateHTML } from "@tiptap/html/server";
import sanitizeHtml from "sanitize-html";
import { postExtensions } from "@/lib/post-extensions";
import { postImagesBaseUrl } from "@/lib/posts";

/*
 * Chuyển nội dung Tiptap (JSON) thành HTML để hiển thị công khai. Chỉ chạy trên server.
 * Dù chỉ Admin soạn bài, HTML vẫn được lọc lại bằng danh sách thẻ/thuộc tính cho phép,
 * ảnh chỉ nhận từ bucket post-images, link chỉ nhận http/https/mailto/tel.
 */

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "h2", "h3", "strong", "em", "u", "s", "a", "ul", "ol", "li", "blockquote", "img"],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title", "loading", "decoding"],
    ol: ["start"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["https", "http"] },
  allowProtocolRelative: false,
  exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src?.startsWith(postImagesBaseUrl()),
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        href: attribs.href ?? "",
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      },
    }),
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, loading: "lazy", decoding: "async" },
    }),
  },
};

/** JSON Tiptap → HTML đã lọc an toàn. Nội dung hỏng thì trả chuỗi rỗng. */
export function renderPostHtml(content: unknown): string {
  try {
    const html = generateHTML(content as Parameters<typeof generateHTML>[0], postExtensions);
    return sanitizeHtml(html, SANITIZE_OPTIONS);
  } catch (error) {
    console.error("renderPostHtml:", error);
    return "";
  }
}
