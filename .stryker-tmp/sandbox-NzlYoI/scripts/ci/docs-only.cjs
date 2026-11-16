function isDocumentationFile(filename) {
  return typeof filename === "string" && (
    filename.startsWith("docs/") ||
    filename.toLowerCase().endsWith(".md") ||
    filename === ".markdownlint-cli2.jsonc" ||
    filename === "lychee.toml"
  );
}

function isDocsOnlyChange({ changedFiles, files } = {}) {
  return Number.isInteger(changedFiles) &&
    changedFiles > 0 &&
    Array.isArray(files) &&
    files.length === changedFiles &&
    files.every((file) =>
      file &&
      isDocumentationFile(file.filename) &&
      (!file.previous_filename || isDocumentationFile(file.previous_filename))
    );
}

module.exports = { isDocsOnlyChange };
