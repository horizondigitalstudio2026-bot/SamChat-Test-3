/**
 * SamChat — Contrôleur Utilisateurs & Contacts
 */

const User = require('../models/User');
const Contact = require('../models/Contact');

async function updateProfile(req, res, next) {
  try {
    const { displayName, bio, theme } = req.body;
    const avatarUrl = req.file ? `/uploads/images/${req.file.filename}` : undefined;
    const user = User.updateProfile(req.user.id, { displayName, bio, avatarUrl, theme });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function search(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'La recherche doit contenir au moins 2 caractères.' });
    }
    const results = User.search(q.trim(), req.user.id);
    res.json({ results });
  } catch (err) {
    next(err);
  }
}

async function listContacts(req, res, next) {
  try {
    res.json({ contacts: Contact.list(req.user.id) });
  } catch (err) {
    next(err);
  }
}

async function addContact(req, res, next) {
  try {
    const { contactId } = req.body;
    const target = User.findById(contactId);
    if (!target) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    if (contactId === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous ajouter vous-même.' });
    }

    const contacts = Contact.add(req.user.id, contactId);
    res.status(201).json({ contacts });
  } catch (err) {
    next(err);
  }
}

async function removeContact(req, res, next) {
  try {
    Contact.remove(req.user.id, req.params.contactId);
    res.json({ contacts: Contact.list(req.user.id) });
  } catch (err) {
    next(err);
  }
}

module.exports = { updateProfile, search, listContacts, addContact, removeContact };