const express = require("express");
const router = express.Router();
const proctoringNoteController = require("./proctoringNote.controller");
const authenticate = require("../../shared/middlewares/auth.middleware");

router.post("/create-notes", authenticate, proctoringNoteController.createNote);
router.get("/fetch-notes", authenticate, proctoringNoteController.getNotes);

module.exports = router;
