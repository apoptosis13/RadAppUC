# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0-RC2] - 2026-01-23

### Added
- **AI Quiz Feedback:** Instructors can now report issues with AI-generated questions directly from the quiz interface.
- **Feedback Modal:** New modal component to capture report reason and comments.
- **Image Panning:** Users can now pan/drag zoomed images in the case viewer (`ImageViewer`).

### Changed
- **Case Layout:** Optimized `CaseDetail` layout to split screen between image (55%) and discussion (45%) when active.
- **Translation System:** Improved language detection logic to handle locale variants (e.g., 'en-US') correctly.
- **RichTextEditor:** Updated editor logic to support dynamic content updates in read-only mode, fixing translation switching.

### Fixed
- **Security Rules:** Added Firestore rules for `quiz_feedback` collection to allow authenticated submissions.
- **Build System:** Resolved build failures related to dynamic imports and chunk size warnings.
