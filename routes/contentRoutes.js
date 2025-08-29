import express from 'express';
import PrivacyPolicy from '../models/PrivacyPolicy.js';
import TermsAndConditions from '../models/TermsAndConditions.js';
import ReturnAndRefund from '../models/ReturnAndRefund.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Test route to verify the router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Content routes are working!' });
});

// ==================== PRIVACY POLICY ROUTES ====================

// Get active privacy policy
router.get('/privacy-policy', async (req, res) => {
  try {
    const policy = await PrivacyPolicy.findOne({ isActive: true });
    if (!policy) {
      return res.status(404).json({ message: 'No active privacy policy found' });
    }
    res.json(policy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all privacy policies (admin)
router.get('/admin/privacy-policy', protect, admin, async (req, res) => {
  try {
    const policies = await PrivacyPolicy.find({}).populate('lastUpdatedBy', 'name email');
    res.json(policies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create/Update privacy policy (admin)
router.post('/admin/privacy-policy', protect, admin, async (req, res) => {
  try {
    console.log('[Privacy Policy] POST request received');
    console.log('[Privacy Policy] Request body:', req.body);
    console.log('[Privacy Policy] User:', req.user);
    
    const { content, version } = req.body;
    
    // Deactivate all existing policies
    await PrivacyPolicy.updateMany({}, { isActive: false });
    
    // Create new policy
    const policy = await PrivacyPolicy.create({
      content,
      version: version || '1.0',
      lastUpdatedBy: req.user._id
    });
    
    console.log('[Privacy Policy] Policy created successfully:', policy);
    res.status(201).json(policy);
  } catch (error) {
    console.error('[Privacy Policy] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ==================== TERMS AND CONDITIONS ROUTES ====================

// Get active terms and conditions
router.get('/terms-conditions', async (req, res) => {
  try {
    const terms = await TermsAndConditions.findOne({ isActive: true });
    if (!terms) {
      return res.status(404).json({ message: 'No active terms and conditions found' });
    }
    res.json(terms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all terms and conditions (admin)
router.get('/admin/terms-conditions', protect, admin, async (req, res) => {
  try {
    const terms = await TermsAndConditions.find({}).populate('lastUpdatedBy', 'name email');
    res.json(terms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create/Update terms and conditions (admin)
router.post('/admin/terms-conditions', protect, admin, async (req, res) => {
  try {
    const { content, version } = req.body;
    
    // Deactivate all existing terms
    await TermsAndConditions.updateMany({}, { isActive: false });
    
    // Create new terms
    const terms = await TermsAndConditions.create({
      content,
      version: version || '1.0',
      lastUpdatedBy: req.user._id
    });
    
    res.status(201).json(terms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== RETURN AND REFUND ROUTES ====================

// Get active return and refund policy
router.get('/return-refund', async (req, res) => {
  try {
    const policy = await ReturnAndRefund.findOne({ isActive: true });
    if (!policy) {
      return res.status(404).json({ message: 'No active return and refund policy found' });
    }
    res.json(policy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all return and refund policies (admin)
router.get('/admin/return-refund', protect, admin, async (req, res) => {
  try {
    const policies = await ReturnAndRefund.find({}).populate('lastUpdatedBy', 'name email');
    res.json(policies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create/Update return and refund policy (admin)
router.post('/admin/return-refund', protect, admin, async (req, res) => {
  try {
    const { content, version } = req.body;
    
    // Deactivate all existing policies
    await ReturnAndRefund.updateMany({}, { isActive: false });
    
    // Create new policy
    const policy = await ReturnAndRefund.create({
      content,
      version: version || '1.0',
      lastUpdatedBy: req.user._id
    });
    
    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
