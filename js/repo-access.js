document.querySelectorAll(".repo-name[data-unavailable]").forEach((repoLink) => {
    repoLink.addEventListener("click", (event) => {
        event.preventDefault();
        alert("出错了！这个仓库暂时无法访问。");
    });
});
