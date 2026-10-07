// 解密配置
const password1 = "2ent6k4iyd"; // Portfolio 2 中得到
const password2 = "234234";
const password3 = "345345";
const password4 = "456456";

const hint1 = "土";
const hint2 = "请输入密码2";
const hint3 = "请输入密码3";
const hint4 = "请输入密码4";

const documentCredentials = {
    "1.md": { password: password1, hint: hint1 },
    "2.md": { password: password2, hint: hint2 },
    "3.md": { password: password3, hint: hint3 },
    "4.md": { password: password4, hint: hint4 }
};
const documentButtons = [...document.querySelectorAll(".document-file-button")];
const preview = document.querySelector("#markdown-preview");
const filenameLabel = document.querySelector("#document-filename");
const commitMessage = document.querySelector("#document-commit-message");
const sizeLabel = document.querySelector("#document-size");
const errorLabel = document.querySelector("#document-error");
const lockOverlay = document.querySelector("#document-lock");
const unlockForm = document.querySelector("#document-unlock-form");
const passwordHint = document.querySelector("#document-password-hint");
const passwordInput = document.querySelector("#document-password");
const passwordFeedback = document.querySelector("#document-password-feedback");
const filterInput = document.querySelector(".document-search input");
const unlockedStoragePrefix = "secret-repo-unlocked:";
const currentDocumentStorageKey = "secret-repo-current-document";
let activeRequest = 0;
let selectedFilename = "1.md";

function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function renderInlineMarkdown(text) {
    const tokenPattern = /(`[^`]+`|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;
    let html = "";
    let lastIndex = 0;

    for (const match of text.matchAll(tokenPattern)) {
        html += escapeHtml(text.slice(lastIndex, match.index));
        const token = match[0];

        if (token.startsWith("`")) {
            html += `<code>${escapeHtml(token.slice(1, -1))}</code>`;
        } else if (token.startsWith("[")) {
            const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (link) {
                const [, label, url] = link;
                if (/^(https?:\/\/|mailto:|\/|\.\/|\.\.\/|#)/i.test(url)) {
                    html += `<a href="${escapeHtml(url)}">${renderInlineMarkdown(label)}</a>`;
                } else {
                    html += escapeHtml(token);
                }
            }
        } else if (token.startsWith("**") || token.startsWith("__")) {
            html += `<strong>${escapeHtml(token.slice(2, -2))}</strong>`;
        } else {
            html += `<em>${escapeHtml(token.slice(1, -1))}</em>`;
        }

        lastIndex = match.index + token.length;
    }

    return html + escapeHtml(text.slice(lastIndex));
}

function renderMarkdown(markdown) {
    const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
    const output = [];
    let index = 0;

    while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) {
            index += 1;
            continue;
        }

        const fence = line.match(/^```/);
        if (fence) {
            const codeLines = [];
            index += 1;
            while (index < lines.length && !/^```\s*$/.test(lines[index])) {
                codeLines.push(lines[index]);
                index += 1;
            }
            if (index < lines.length) index += 1;
            output.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
            continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
        if (heading) {
            const level = heading[1].length;
            output.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
            index += 1;
            continue;
        }

        if (/^\s*((([-*_])\s*){3,})$/.test(line)) {
            output.push("<hr>");
            index += 1;
            continue;
        }

        if (/^\s*>\s?/.test(line)) {
            const quoteLines = [];
            while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
                quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
                index += 1;
            }
            output.push(`<blockquote>${renderMarkdown(quoteLines.join("\n"))}</blockquote>`);
            continue;
        }

        const listMatch = line.match(/^\s*([-*+]|\d+\.)\s+(.+)$/);
        if (listMatch) {
            const ordered = /^\d/.test(listMatch[1]);
            const tag = ordered ? "ol" : "ul";
            const items = [];
            while (index < lines.length) {
                const item = lines[index].match(/^\s*([-*+]|\d+\.)\s+(.+)$/);
                if (!item || /^\d/.test(item[1]) !== ordered) break;
                items.push(`<li>${renderInlineMarkdown(item[2])}</li>`);
                index += 1;
            }
            output.push(`<${tag}>${items.join("")}</${tag}>`);
            continue;
        }

        const paragraph = [line.trim()];
        index += 1;
        while (
            index < lines.length &&
            lines[index].trim() &&
            !/^(#{1,6}\s|```|>\s?)/.test(lines[index]) &&
            !/^\s*([-*+]|\d+\.)\s+/.test(lines[index]) &&
            !/^\s*((([-*_])\s*){3,})$/.test(lines[index])
        ) {
            paragraph.push(lines[index].trim());
            index += 1;
        }
        output.push(`<p>${renderInlineMarkdown(paragraph.join("\n"))}</p>`);
    }

    return output.join("\n");
}

async function loadDocument(filename) {
    const requestId = ++activeRequest;
    preview.innerHTML = '<p class="document-loading">Loading document...</p>';
    errorLabel.hidden = true;
    filenameLabel.textContent = filename;
    commitMessage.textContent = `Update ${filename}`;
    document.title = `secret/${filename}`;

    try {
        const response = await fetch(`documents/${encodeURIComponent(filename)}`);
        if (!response.ok) {
            throw new Error(`Unable to load ${filename} (HTTP ${response.status}).`);
        }

        const markdown = await response.text();
        if (requestId !== activeRequest) return;

        preview.innerHTML = renderMarkdown(markdown);
        const lineCount = markdown.length ? markdown.split(/\r\n?|\n/).length : 0;
        const byteCount = new TextEncoder().encode(markdown).length;
        sizeLabel.textContent = `${lineCount} lines · ${byteCount < 1024 ? `${byteCount} B` : `${(byteCount / 1024).toFixed(2)} KB`}`;
    } catch (error) {
        if (requestId !== activeRequest) return;
        preview.replaceChildren();
        errorLabel.textContent = window.location.protocol === "file:"
            ? `无法加载 ${filename}：浏览器不允许通过 file:// 页面读取本地 Markdown 文件。请使用 VS Code Live Server，或在项目目录运行 python -m http.server 8000，然后打开 http://localhost:8000/documents.html。`
            : `Could not load ${filename}. ${error.message}`;
        errorLabel.hidden = false;
    }
}

function hasUnlockedDocument(filename) {
    try {
        return localStorage.getItem(`${unlockedStoragePrefix}${filename}`) === "true";
    } catch (error) {
        passwordFeedback.textContent = `无法读取解锁记录：${error.message}`;
        return false;
    }
}

function selectDocument(filename) {
    selectedFilename = filename;
    const credentials = documentCredentials[filename];
    if (!credentials) {
        throw new Error(`No password configuration found for ${filename}.`);
    }

    filenameLabel.textContent = filename;
    commitMessage.textContent = `Update ${filename}`;
    document.title = `secret/${filename}`;
    passwordHint.textContent = credentials.hint;
    passwordInput.value = "";
    passwordFeedback.textContent = "";
    sizeLabel.textContent = "";

    try {
        localStorage.setItem(currentDocumentStorageKey, filename);
    } catch (error) {
        passwordFeedback.textContent = `无法保存当前文件：${error.message}`;
    }

    if (!hasUnlockedDocument(filename)) {
        activeRequest += 1;
        preview.replaceChildren();
        lockOverlay.hidden = false;
        return;
    }

    lockOverlay.hidden = true;
    loadDocument(filename);
}

function setActiveDocument(filename) {
    for (const button of documentButtons) {
        const isActive = button.dataset.document === filename;
        button.classList.toggle("active", isActive);
        if (isActive) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    }
}

function getInitialDocument() {
    const requestedDocument = new URLSearchParams(window.location.search).get("file");
    if (documentCredentials[requestedDocument]) {
        return requestedDocument;
    }

    try {
        const savedFilename = localStorage.getItem(currentDocumentStorageKey);
        return documentCredentials[savedFilename] ? savedFilename : "1.md";
    } catch (error) {
        passwordFeedback.textContent = `无法读取当前文件记录：${error.message}`;
        return "1.md";
    }
}

unlockForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const credentials = documentCredentials[selectedFilename];
    const normalizedPassword = passwordInput.value.replace(/\s/g, "");
    passwordInput.value = normalizedPassword;

    if (normalizedPassword !== credentials.password) {
        passwordFeedback.textContent = "密码不正确，请重试。";
        passwordInput.focus();
        return;
    }

    try {
        localStorage.setItem(`${unlockedStoragePrefix}${selectedFilename}`, "true");
    } catch (error) {
        passwordFeedback.textContent = `无法保存解锁状态：${error.message}`;
        return;
    }

    passwordFeedback.textContent = "";
    lockOverlay.hidden = true;
    loadDocument(selectedFilename);
});

for (const button of documentButtons) {
    button.addEventListener("click", () => {
        const filename = button.dataset.document;
        setActiveDocument(filename);
        selectDocument(filename);
    });
}

filterInput.addEventListener("input", () => {
    const query = filterInput.value.trim().toLowerCase();
    for (const button of documentButtons) {
        button.hidden = !button.textContent.trim().toLowerCase().includes(query);
    }
});

const initialDocument = getInitialDocument();
setActiveDocument(initialDocument);
selectDocument(initialDocument);