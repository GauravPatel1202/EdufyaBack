import axios from 'axios';
import EmailQueue, { IEmailQueue } from '../models/EmailQueue';

const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || 'http://localhost:3001/api/email';
const EMAIL_SERVICE_API_KEY = process.env.EMAIL_SERVICE_API_KEY || 'your-secret-api-key-here'; // Match defaults or use env

export const emailService = {
  /**
   * Send a generic email via the EdufyaEmail microservice
   */
  sendEmail: async (to: string, subject: string, html: string, text?: string) => {
    try {
      console.log(`[EmailService] Sending email to ${to} via ${EMAIL_SERVICE_URL}`);
      
      const response = await axios.post(
        `${EMAIL_SERVICE_URL}/send-generic`,
        { to, subject, html, text },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': EMAIL_SERVICE_API_KEY
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[EmailService] Failed to send email:', error.response?.data || error.message);
      // Fallback: If microservice is down, log it but don't crash main app flow if possible?
      // Or throw to let caller handle it.
      throw new Error(error.response?.data?.message || 'Failed to send email via microservice');
    }
  },

  /**
   * Send a welcome email via the EdufyaEmail microservice
   */
  sendWelcomeEmail: async (email: string, userName: string) => {
    try {
      console.log(`[EmailService] Sending welcome email to ${email}`);
      const response = await axios.post(
        `${EMAIL_SERVICE_URL}/send-welcome`,
        { email, userName },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': EMAIL_SERVICE_API_KEY
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('[EmailService] Failed to send welcome email:', error.response?.data || error.message);
      // Don't throw for welcome emails to avoid blocking registration flow? 
      // Or maybe we want to know. Let's return null to indicate failure but not crash.
      return null;
    }
  },

  /**
   * Add email to queue for background processing
   */
  addToQueue: async (to: string, subject: string, html: string, text?: string) => {
    try {
      const emailJob = await EmailQueue.create({
        to,
        subject,
        html,
        text,
        status: 'pending'
      });
      console.log(`[EmailQueue] Added job ${emailJob._id} for ${to}`);
      
      // Optionally trigger processing immediately (fire and forget)
      // emailService.processQueue(); 
      
      return emailJob;
    } catch (error: any) {
      console.error('[EmailQueue] Failed to add to queue:', error.message);
      throw error;
    }
  },

  /**
   * Process pending emails in the queue
   */
  processQueue: async () => {
    const jobs = await EmailQueue.find({ status: 'pending' }).limit(5); // Process 5 at a time
    
    if (jobs.length === 0) return;

    console.log(`[EmailQueue] Processing ${jobs.length} jobs...`);

    for (const job of jobs) {
      job.status = 'processing';
      job.attempts += 1;
      job.lastAttempt = new Date();
      await job.save();

      try {
        await axios.post(
          `${EMAIL_SERVICE_URL}/send-generic`,
          { 
            to: job.to, 
            subject: job.subject, 
            html: job.html, 
            text: job.text 
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': EMAIL_SERVICE_API_KEY
            }
          }
        );

        job.status = 'completed';
        job.updatedAt = new Date(); // Explicitly update for sorting if needed
        await job.save();
        console.log(`[EmailQueue] Job ${job._id} completed successfully.`);

      } catch (error: any) {
        console.error(`[EmailQueue] Job ${job._id} failed:`, error.message);
        job.status = 'failed';
        job.error = error.message;
        await job.save();
        
        // Retry logic could go here (e.g., if attempts < 3 set status back to pending)
        if (job.attempts < 3) {
            job.status = 'pending';
            await job.save();
            console.log(`[EmailQueue] Job ${job._id} queued for retry.`);
        }
      }
    }
  },

  /**
   * Send an OTP email via the EdufyaEmail microservice
   */
  sendOTP: async (email: string, otp: string) => {
    try {
      console.log(`[EmailService] Sending OTP to ${email}`);
      const response = await axios.post(
        `${EMAIL_SERVICE_URL}/send-otp`,
        { email, otp, expiresIn: 10 }, // Default 10 mins
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': EMAIL_SERVICE_API_KEY
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('[EmailService] Failed to send OTP:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to send OTP via microservice');
    }
  }
};
