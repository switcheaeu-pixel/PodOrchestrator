const { v4: uuidv4 } = require('uuid');
const Queue = require('bull');
const Redis = require('ioredis');
const logger = require('../utils/logger');

class WorkflowEngine {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 0
    });
    
    this.workflowQueue = new Queue('podcast-workflow', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    });
    
    this.setupQueueProcessors();
  }
  
  setupQueueProcessors() {
    // Process workflow steps
    this.workflowQueue.process('topic-expansion', this.processTopicExpansion.bind(this));
    this.workflowQueue.process('script-writing', this.processScriptWriting.bind(this));
    this.workflowQueue.process('voice-generation', this.processVoiceGeneration.bind(this));
    this.workflowQueue.process('audio-editing', this.processAudioEditing.bind(this));
    this.workflowQueue.process('transcription', this.processTranscription.bind(this));
    this.workflowQueue.process('show-notes', this.processShowNotes.bind(this));
    this.workflowQueue.process('marketing-assets', this.processMarketingAssets.bind(this));
    
    // Event handlers
    this.workflowQueue.on('completed', (job, result) => {
      logger.info(`Workflow step completed: ${job.name}`, {
        jobId: job.id,
        workflowId: job.data.workflowId,
        result
      });
      
      // Update workflow status in database
      this.updateWorkflowStep(job.data.workflowId, job.name, 'completed', result);
      
      // Trigger next step if this step completed successfully
      this.triggerNextStep(job.data.workflowId, job.name);
    });
    
    this.workflowQueue.on('failed', (job, error) => {
      logger.error(`Workflow step failed: ${job.name}`, {
        jobId: job.id,
        workflowId: job.data.workflowId,
        error: error.message
      });
      
      // Update workflow status
      this.updateWorkflowStep(job.data.workflowId, job.name, 'failed', { error: error.message });
      
      // Try fallback or notify admin
      this.handleStepFailure(job.data.workflowId, job.name, error);
    });
    
    this.workflowQueue.on('stalled', (job) => {
      logger.warn(`Workflow step stalled: ${job.name}`, {
        jobId: job.id,
        workflowId: job.data.workflowId
      });
    });
  }
  
  async startPodcastWorkflow(data) {
    const workflowId = uuidv4();
    const { podcastId, userId, topic, style, duration, voice, language, additionalOptions } = data;
    
    logger.info(`Starting podcast workflow`, { workflowId, podcastId, userId, topic });
    
    // Define workflow steps
    const workflowSteps = [
      {
        name: 'topic-expansion',
        data: { workflowId, podcastId, userId, topic, style, language },
        delay: 0
      },
      {
        name: 'script-writing',
        data: { workflowId, podcastId, userId, topic, style, duration, language },
        delay: 1000, // 1 second delay after topic expansion
        dependsOn: 'topic-expansion'
      },
      {
        name: 'voice-generation',
        data: { workflowId, podcastId, userId, voice, language },
        delay: 2000,
        dependsOn: 'script-writing'
      },
      {
        name: 'audio-editing',
        data: { workflowId, podcastId, userId },
        delay: 1000,
        dependsOn: 'voice-generation'
      },
      {
        name: 'transcription',
        data: { workflowId, podcastId, userId, language },
        delay: 1000,
        dependsOn: 'audio-editing'
      },
      {
        name: 'show-notes',
        data: { workflowId, podcastId, userId, language },
        delay: 1000,
        dependsOn: 'transcription'
      },
      {
        name: 'marketing-assets',
        data: { workflowId, podcastId, userId, language },
        delay: 1000,
        dependsOn: 'show-notes'
      }
    ];
    
    // Store workflow definition
    await this.storeWorkflowDefinition(workflowId, {
      podcastId,
      userId,
      steps: workflowSteps,
      status: 'processing',
      createdAt: new Date().toISOString()
    });
    
    // Start first step
    await this.workflowQueue.add(
      workflowSteps[0].name,
      workflowSteps[0].data,
      {
        jobId: `${workflowId}_${workflowSteps[0].name}`,
        delay: workflowSteps[0].delay
      }
    );
    
    return workflowId;
  }
  
  async processTopicExpansion(job) {
    const { workflowId, podcastId, userId, topic, style, language } = job.data;
    
    logger.info(`Processing topic expansion`, { workflowId, podcastId, topic });
    
    // Call AI service to expand topic
    const AIService = require('./AIServiceManager');
    const aiService = new AIService();
    
    const result = await aiService.expandTopic({
      topic,
      style,
      language,
      userId
    });
    
    // Store result
    await this.storeStepResult(workflowId, 'topic-expansion', result);
    
    return {
      success: true,
      expandedTopics: result.expandedTopics,
      keyPoints: result.keyPoints,
      estimatedDuration: result.estimatedDuration
    };
  }
  
  async processScriptWriting(job) {
    const { workflowId, podcastId, userId, topic, style, duration, language } = job.data;
    
    logger.info(`Processing script writing`, { workflowId, podcastId, topic });
    
    // Get topic expansion results
    const topicResults = await this.getStepResult(workflowId, 'topic-expansion');
    
    // Call AI service to write script
    const AIService = require('./AIServiceManager');
    const aiService = new AIService();
    
    const result = await aiService.writeScript({
      topic,
      style,
      duration,
      language,
      expandedTopics: topicResults.expandedTopics,
      keyPoints: topicResults.keyPoints,
      userId
    });
    
    // Store result
    await this.storeStepResult(workflowId, 'script-writing', result);
    
    return {
      success: true,
      script: result.script,
      wordCount: result.wordCount,
      estimatedAudioDuration: result.estimatedAudioDuration
    };
  }
  
  async processVoiceGeneration(job) {
    const { workflowId, podcastId, userId, voice, language } = job.data;
    
    logger.info(`Processing voice generation`, { workflowId, podcastId, voice });
    
    // Get script
    const scriptResults = await this.getStepResult(workflowId, 'script-writing');
    
    // Call TTS service
    const TTSService = require('./TTSService');
    const ttsService = new TTSService();
    
    const result = await ttsService.generateAudio({
      text: scriptResults.script,
      voice,
      language,
      userId
    });
    
    // Store result
    await this.storeStepResult(workflowId, 'voice-generation', result);
    
    return {
      success: true,
      audioUrl: result.audioUrl,
      duration: result.duration,
      format: result.format,
      size: result.size
    };
  }
  
  async processAudioEditing(job) {
    const { workflowId, podcastId, userId } = job.data;
    
    logger.info(`Processing audio editing`, { workflowId, podcastId });
    
    // Get generated audio
    const voiceResults = await this.getStepResult(workflowId, 'voice-generation');
    
    // Call audio editing service
    const AudioService = require('./AudioService');
    const audioService = new AudioService();
    
    const result = await audioService.editAudio({
      audioUrl: voiceResults.audioUrl,
      userId,
      podcastId
    });
    
    // Store result
    await this.storeStepResult(workflowId, 'audio-editing', result);
    
    return {
      success: true,
      editedAudioUrl: result.editedAudioUrl,
      duration: result.duration,
      enhancements: result.enhancements
    };
  }
  
  async processTranscription(job) {
    const { workflowId, podcastId, userId, language } = job.data;
    
    logger.info(`Processing transcription`, { workflowId, podcastId, language });
    
    // Get edited audio
    const audioResults = await this.getStepResult(workflowId, 'audio-editing');
    
    // Call transcription service
    const TranscriptionService = require('./TranscriptionService');
    const transcriptionService = new TranscriptionService();
    
    const result = await transcriptionService.transcribeAudio({
      audioUrl: audioResults.editedAudioUrl,
      language,
      userId
    });
    
    // Store result
    await this.storeStepResult(workflowId, 'transcription', result);
    
    return {
      success: true,
      transcript: result.transcript,
      wordCount: result.wordCount,
      confidence: result.confidence,
      segments: result.segments
    };
  }
  
  async processShowNotes(job) {
    const { workflowId, podcastId, userId, language } = job.data;
    
    logger.info(`Processing show notes`, { workflowId, podcastId, language });
    
    // Get transcript and script
    const transcriptResults = await this.getStepResult(workflowId, 'transcription');
    const scriptResults = await this.getStepResult(workflowId, 'script-writing');
    
    // Call AI service for show notes
    const AIService = require('./AIServiceManager');
    const aiService = new AIService();
    
    const result = await aiService.generateShowNotes({
      transcript: transcriptResults.transcript,
      originalScript: scriptResults.script,
      language,
      userId
    });
    
    // Store result
    await this.storeStepResult(workflowId, 'show-notes', result);
    
    return {
      success: true,
      showNotes: result.showNotes,
      summary: result.summary,
      keyPoints: result.keyPoints,
      tags: result.tags
    };
  }
  
  async processMarketingAssets(job) {
    const { workflowId, podcastId, userId, language } = job.data;
    
    logger.info(`Processing marketing assets`, { workflowId, podcastId, language });
    
    // Get all previous results
    const topicResults = await this.getStepResult(workflowId, 'topic-expansion');
    const showNotesResults = await this.getStepResult(workflowId, 'show-notes');
    const audioResults = await this.getStepResult(workflowId, 'audio-editing');
    
    // Call marketing service
    const MarketingService = require('./MarketingService');
    const marketingService = new MarketingService();
    
    const result = await marketingService.generateAssets({
      topic: topicResults.expandedTopics[0],
      showNotes: showNotesResults.showNotes,
      audioUrl: audioResults.editedAudioUrl,
      language,
      userId,
      podcastId
    });
    
    // Store result
    await this.storeStepResult(workflowId, 'marketing-assets', result);
    
    // Mark workflow as completed
    await this.markWorkflowCompleted(workflowId, podcastId);
    
    return {
      success: true,
      assets: result.assets,
      socialMediaPosts: result.socialMediaPosts,
      audiograms: result.audiograms
    };
  }
  
  async triggerNextStep(workflowId, completedStepName) {
    // Get workflow definition
    const workflow = await this.getWorkflowDefinition(workflowId);
    
    if (!workflow || !workflow.steps) {
      logger.error(`Workflow not found: ${workflowId}`);
      return;
    }
    
    // Find current step index
    const currentStepIndex = workflow.steps.findIndex(step => step.name === completedStepName);
    
    if (currentStepIndex === -1 || currentStepIndex >= workflow.steps.length - 1) {
      // No more steps
      return;
    }
    
    // Get next step
    const nextStep = workflow.steps[currentStepIndex + 1];
    
    // Check if next step depends on the completed step
    if (nextStep.dependsOn && nextStep.dependsOn !== completedStepName) {
      // Check if all dependencies are met
      const dependenciesMet = await this.checkDependencies(workflowId, nextStep.dependsOn);
      if (!dependenciesMet) {
        return;
      }
    }
    
    // Add next step to queue
    await this.workflowQueue.add(
      nextStep.name,
      nextStep.data,
      {
        jobId: `${workflowId}_${nextStep.name}`,
        delay: nextStep.delay || 0
      }
    );
    
    logger.info(`Triggered next step: ${nextStep.name}`, { workflowId });
  }
  
  async checkDependencies(workflowId, dependencies) {
    if (typeof dependencies === 'string') {
      const stepResult = await this.getStepResult(workflowId, dependencies);
      return stepResult && stepResult.success !== false;
    } else if (Array.isArray(dependencies)) {
      const results = await Promise.all(
        dependencies.map(dep => this.getStepResult(workflowId, dep))
      );
      return results.every(result => result && result.success !== false);
    }
    return true;
  }
  
  async handleStepFailure(workflowId, stepName, error) {
    logger.error(`Handling step failure: ${stepName}`, { workflowId, error: error.message });
    
    // Try fallback service if available
    const canRetryWithFallback = await this.tryFallbackService(workflowId, stepName, error);
    
    if (!canRetryWithFallback) {
      // Mark workflow as failed
      await this.markWorkflowFailed(workflowId, stepName, error);
      
      // Notify user
      await this.notifyUserOfFailure(workflowId, stepName, error);
    }
  }
  
  async tryFallbackService(workflowId, stepName, error) {
    // Implement fallback logic based on step type
    switch (stepName) {
      case 'voice-generation':
        // Try different TTS provider
        return await this.retryWithFallbackTTS(workflowId);
      case 'transcription':
        // Try different transcription service
        return await this.retryWithFallbackTranscription(workflowId);
      default:
        return false;
    }
  }
  
  async retryWithFallbackTTS(workflowId) {
    try {
      // Get script
      const scriptResults = await this.getStepResult(workflowId, 'script-writing');
      
      // Try with Google TTS as fallback
      const TTSService = require('./TTSService');
      const ttsService = new TTSService();
      
      const result = await ttsService.generateAudioWithFallback({
        text: scriptResults.script,
        primaryProvider: 'elevenlabs',
        fallbackProvider: 'google',
        language: 'it'
      });
      
      if (result.success) {
        await this.storeStepResult(workflowId, 'voice-generation', result);
        await this.triggerNextStep(workflowId, 'voice-generation');
        return true;
      }
    } catch (fallbackError) {
      logger.error(`Fallback TTS also failed`, { workflowId, error: fallbackError.message });
    }
    
    return false;
  }
  
  // Storage methods
  async storeWorkflowDefinition(workflowId, definition) {
    const key = `workflow:${workflowId}:definition`;
    await this.redis.setex(key, 86400, JSON.stringify(definition)); // 24 hours TTL
  }
  
  async getWorkflowDefinition(workflowId) {
    const key = `workflow:${workflowId}:definition`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  async storeStepResult(workflowId, stepName, result) {
    const key = `workflow:${workflowId}:step:${stepName}`;
    await this.redis.setex(key, 86400, JSON.stringify(result)); // 24 hours TTL
  }
  
  async getStepResult(workflowId, stepName) {
    const key = `workflow:${workflowId}:step:${stepName}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  async updateWorkflowStep(workflowId, stepName, status, data = {}) {
    const key = `workflow:${workflowId}:steps`;
    await this.redis.hset(key, stepName, JSON.stringify({ status, ...data, updatedAt: new Date().toISOString() }));
    await this.redis.expire(key, 86400);
  }
  
  async markWorkflowCompleted(workflowId, podcastId) {
    // Update workflow status
    await this.updateWorkflowStep(workflowId, 'workflow', 'completed', { completedAt: new Date().toISOString() });
    
    // Update podcast in database
    const Podcast = require('../models/Podcast');
    const podcast = await Podcast.findById(podcastId);
    if (podcast) {
      await podcast.update({
        status: 'completed',
        completedAt: new Date().toISOString()
      });
    }
    
    // Notify user
    await this.notifyUserOfCompletion(workflowId, podcastId);
    
    logger.info(`Workflow completed`,