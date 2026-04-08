const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const Podcast = require('../models/Podcast');
const WorkflowEngine = require('../services/WorkflowEngine');
const BillingManager = require('../services/BillingManager');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// Validation middleware for podcast creation
const validatePodcastCreation = [
  body('topic')
    .trim()
    .notEmpty()
    .withMessage('Il topic è obbligatorio')
    .isLength({ min: 5, max: 200 })
    .withMessage('Il topic deve essere tra 5 e 200 caratteri'),
  
  body('style')
    .optional()
    .isIn(['conversational', 'educational', 'interview', 'storytelling', 'news'])
    .withMessage('Stile non valido'),
  
  body('duration')
    .optional()
    .isInt({ min: 5, max: 120 })
    .withMessage('La durata deve essere tra 5 e 120 minuti'),
  
  body('voice')
    .optional()
    .isString()
    .withMessage('La voce deve essere una stringa'),
  
  body('language')
    .optional()
    .default('it')
    .isIn(['it', 'en', 'es', 'fr', 'de'])
    .withMessage('Lingua non supportata'),
  
  body('additionalOptions')
    .optional()
    .isObject()
    .withMessage('Opzioni aggiuntive devono essere un oggetto')
];

/**
 * @route POST /api/podcasts
 * @desc Create a new podcast
 * @access Private
 */
router.post('/', validatePodcastCreation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const userId = req.user.id;
    const {
      topic,
      style = 'conversational',
      duration = 30,
      voice = 'italian_male_1',
      language = 'it',
      additionalOptions = {}
    } = req.body;
    
    logger.info(`Creating podcast for user ${userId}`, { topic, style, duration });
    
    // Check user credits
    const billingManager = new BillingManager();
    const estimatedCost = await billingManager.estimatePodcastCost({
      duration,
      style,
      language
    });
    
    const hasCredits = await billingManager.checkUserCredits(userId, estimatedCost);
    if (!hasCredits) {
      return res.status(402).json({
        success: false,
        error: 'Crediti insufficienti',
        message: 'Non hai crediti sufficienti per creare questo podcast. Aggiorna il tuo piano.',
        requiredCredits: estimatedCost,
        currentTier: req.user.tier
      });
    }
    
    // Create podcast record
    const podcastId = uuidv4();
    const podcast = new Podcast({
      id: podcastId,
      userId,
      title: `Podcast: ${topic.substring(0, 50)}...`,
      description: `Podcast generato automaticamente su: ${topic}`,
      topic,
      style,
      targetDuration: duration,
      status: 'processing',
      metadata: {
        voice,
        language,
        additionalOptions,
        estimatedCost
      }
    });
    
    await podcast.save();
    
    // Start workflow
    const workflowEngine = new WorkflowEngine();
    const workflowId = await workflowEngine.startPodcastWorkflow({
      podcastId,
      userId,
      topic,
      style,
      duration,
      voice,
      language,
      additionalOptions
    });
    
    // Update podcast with workflow ID
    await podcast.update({ workflowId });
    
    // Track initial cost estimation
    await billingManager.trackEstimation(userId, 'podcast_creation', estimatedCost, podcastId);
    
    logger.info(`Podcast workflow started`, { podcastId, workflowId, userId });
    
    res.status(201).json({
      success: true,
      data: {
        podcastId,
        workflowId,
        status: 'processing',
        estimatedCompletion: '2-5 minutes',
        estimatedCost,
        message: 'Podcast in creazione. Riceverai una notifica al completamento.'
      }
    });
    
  } catch (error) {
    logger.error('Error creating podcast:', error);
    res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      message: 'Si è verificato un errore durante la creazione del podcast'
    });
  }
});

/**
 * @route GET /api/podcasts
 * @desc Get user's podcasts
 * @access Private
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build query
    let query = { userId };
    if (status) {
      query.status = status;
    }
    
    const podcasts = await Podcast.findByUser(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy,
      sortOrder: sortOrder.toUpperCase()
    });
    
    const total = await Podcast.countByUser(userId, status);
    
    res.json({
      success: true,
      data: {
        podcasts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Error fetching podcasts:', error);
    res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
});

/**
 * @route GET /api/podcasts/:id
 * @desc Get podcast details
 * @access Private
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const podcastId = req.params.id;
    
    const podcast = await Podcast.findById(podcastId);
    
    if (!podcast) {
      return res.status(404).json({
        success: false,
        error: 'Podcast non trovato'
      });
    }
    
    // Check ownership
    if (podcast.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accesso negato'
      });
    }
    
    // Get workflow status if available
    let workflowStatus = null;
    if (podcast.workflowId) {
      const workflowEngine = new WorkflowEngine();
      workflowStatus = await workflowEngine.getWorkflowStatus(podcast.workflowId);
    }
    
    // Get cost breakdown
    const billingManager = new BillingManager();
    const costBreakdown = await billingManager.getPodcastCostBreakdown(podcastId);
    
    res.json({
      success: true,
      data: {
        podcast,
        workflowStatus,
        costBreakdown
      }
    });
    
  } catch (error) {
    logger.error('Error fetching podcast:', error);
    res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
});

/**
 * @route GET /api/podcasts/:id/status
 * @desc Get podcast creation status
 * @access Private
 */
router.get('/:id/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const podcastId = req.params.id;
    
    const podcast = await Podcast.findById(podcastId);
    
    if (!podcast) {
      return res.status(404).json({
        success: false,
        error: 'Podcast non trovato'
      });
    }
    
    // Check ownership
    if (podcast.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accesso negato'
      });
    }
    
    let workflowStatus = null;
    let progress = 0;
    let currentStep = null;
    let estimatedTimeRemaining = null;
    
    if (podcast.workflowId) {
      const workflowEngine = new WorkflowEngine();
      workflowStatus = await workflowEngine.getWorkflowStatus(podcast.workflowId);
      
      // Calculate progress
      if (workflowStatus && workflowStatus.steps) {
        const completedSteps = workflowStatus.steps.filter(s => s.status === 'completed').length;
        const totalSteps = workflowStatus.steps.length;
        progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
        
        // Find current step
        currentStep = workflowStatus.steps.find(s => s.status === 'running');
        
        // Estimate time remaining (simplified)
        if (currentStep) {
          const averageStepTime = 30; // seconds
          const remainingSteps = totalSteps - completedSteps;
          estimatedTimeRemaining = remainingSteps * averageStepTime;
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        podcastId,
        status: podcast.status,
        progress,
        currentStep,
        estimatedTimeRemaining,
        workflowStatus,
        lastUpdated: podcast.updatedAt
      }
    });
    
  } catch (error) {
    logger.error('Error fetching podcast status:', error);
    res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
});

/**
 * @route DELETE /api/podcasts/:id
 * @desc Delete a podcast
 * @access Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const podcastId = req.params.id;
    
    const podcast = await Podcast.findById(podcastId);
    
    if (!podcast) {
      return res.status(404).json({
        success: false,
        error: 'Podcast non trovato'
      });
    }
    
    // Check ownership
    if (podcast.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accesso negato'
      });
    }
    
    // Check if podcast is still processing
    if (podcast.status === 'processing') {
      return res.status(400).json({
        success: false,
        error: 'Podcast in elaborazione',
        message: 'Non puoi eliminare un podcast mentre è in elaborazione'
      });
    }
    
    // Delete podcast (soft delete)
    await podcast.softDelete();
    
    logger.info(`Podcast deleted`, { podcastId, userId });
    
    res.json({
      success: true,
      message: 'Podcast eliminato con successo'
    });
    
  } catch (error) {
    logger.error('Error deleting podcast:', error);
    res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
});

/**
 * @route POST /api/podcasts/:id/publish
 * @desc Publish a completed podcast
 * @access Private
 */
router.post('/:id/publish', async (req, res) => {
  try {
    const userId = req.user.id;
    const podcastId = req.params.id;
    const { platforms = [] } = req.body;
    
    const podcast = await Podcast.findById(podcastId);
    
    if (!podcast) {
      return res.status(404).json({
        success: false,
        error: 'Podcast non trovato'
      });
    }
    
    // Check ownership
    if (podcast.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accesso negato'
      });
    }
    
    // Check if podcast is completed
    if (podcast.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Podcast non pronto',
        message: 'Il podcast deve essere completato prima della pubblicazione'
      });
    }
    
    // Check if user has publishing rights
    if (req.user.tier === 'free' && platforms.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'Piano insufficiente',
        message: 'Il piano gratuito non include la pubblicazione automatica'
      });
    }
    
    // Update podcast status
    await podcast.update({ status: 'published' });
    
    // If platforms specified, trigger publishing
    if (platforms.length > 0 && req.user.tier !== 'free') {
      // This would integrate with publishing services
      // For now, just log it
      logger.info(`Publishing podcast to platforms`, { podcastId, platforms });
    }
    
    res.json({
      success: true,
      message: 'Podcast pubblicato con successo',
      data: {
        podcastId,
        status: 'published',
        publishedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error publishing podcast:', error);
    res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
});

/**
 * @route GET /api/podcasts/:id/audio
 * @desc Get podcast audio URL
 * @access Private
 */
router.get('/:id/audio', async (req, res) => {
  try {
    const userId = req.user.id;
    const podcastId = req.params.id;
    
    const podcast = await Podcast.findById(podcastId);
    
    if (!podcast) {
      return res.status(404).json({
        success: false,
        error: 'Podcast non trovato'
      });
    }
    
    // Check ownership
    if (podcast.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accesso negato'
      });
    }
    
    // Check if podcast has audio
    if (!podcast.audioUrl) {
      return res.status(404).json({
        success: false,
        error: 'Audio non disponibile',
        message: 'Il podcast non ha ancora un file audio'
      });
    }
    
    // Generate signed URL if using S3
    let audioUrl = podcast.audioUrl;
    
    // If using S3, generate a pre-signed URL
    if (audioUrl.includes('amazonaws.com')) {
      // This would use AWS SDK to generate pre-signed URL
      // For now, return the direct URL
    }
    
    res.json({
      success: true,
      data: {
        podcastId,
        audioUrl,
        duration: podcast.duration,
        format: podcast.audioFormat || 'mp3',
        size: podcast.audioSize
      }
    });
    
  } catch (error) {
    logger.error('Error fetching podcast audio:', error);
    res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
});

module.exports = router;