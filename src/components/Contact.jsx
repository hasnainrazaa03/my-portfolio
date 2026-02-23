import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Copy, Check, Mail, AlertCircle, Loader2, Send, CheckCircle2 } from 'lucide-react';
import emailjs from '@emailjs/browser'; 
import { fadeInUp } from '../animations';
import { PERSONAL_INFO } from '../constants';
import SocialLinks from './SocialLinks';


const errorVariant = {
  hidden: { opacity: 0, y: -10, height: 0 },
  visible: { opacity: 1, y: 0, height: 'auto' },
  exit: { opacity: 0, y: -10, height: 0 }
};

const Contact = () => {
  const [isCopied, setIsCopied] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sendError, setSendError] = useState(null);
  
  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors, isSubmitting } 
  } = useForm({ mode: "onBlur" });
  
  const onSubmit = async (data) => {
    setSendError(null);
    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          from_name: data.name,
          from_email: data.email,
          message: data.message,
          to_name: 'Hasnain'
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );

      setIsSuccess(true);
      reset();
      setTimeout(() => setIsSuccess(false), 8000);
    } catch (error) {
      console.error("Email Failed:", error);
      setSendError("Failed to send message. Please try copying my email instead.");
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(PERSONAL_INFO.email).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); 
    });
  };

  return (
    <section id="contact" className="py-20 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="p-8 md:p-12 rounded-2xl shadow-xl overflow-hidden bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(45,212,191,0.1)]"
        >
          <div className="relative">
            
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6 text-center">
              <span className="text-primary">06.</span> Initialize Contact
            </h2>
            <p className="text-center text-slate-600 dark:text-white mb-8 font-medium opacity-90">
              Have a project idea, opportunity, or just want to say hi? I'd love to hear from you.
            </p>

            <div className="flex flex-col items-center justify-center mb-10 gap-6">
              <div className="inline-flex items-center gap-3 p-3 rounded-xl bg-slate-200/50 dark:bg-white/5 border border-slate-300 dark:border-white/10 backdrop-blur-md hover:border-primary/30 transition-colors group">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Mail size={20} />
                </div>
                <span className="text-slate-800 dark:text-white font-mono text-sm sm:text-base mr-2 font-bold">
                  {PERSONAL_INFO.email}
                </span>
                <div className="relative">
                  <button 
                    onClick={handleCopyEmail}
                    className="p-2 rounded-lg hover:bg-white/10 text-slate-400 dark:text-white hover:text-primary dark:hover:text-primary transition-all active:scale-95"
                  >
                    {isCopied ? <Check size={18} className="text-primary" /> : <Copy size={18} />}
                  </button>
                  <AnimatePresence>
                    {isCopied && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, x: "-50%" }}
                        animate={{ opacity: 1, y: -40 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="absolute left-1/2 top-0 -translate-x-1/2 px-3 py-1 bg-primary text-black text-xs font-bold rounded shadow-lg whitespace-nowrap pointer-events-none"
                      >
                        Copied!
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <SocialLinks />
            </div>

            <div className="relative min-h-[400px]">
              <AnimatePresence mode='wait'>
                {isSuccess ? (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center p-6"
                  >
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 size={40} className="text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Message Sent!</h3>
                    <p className="text-slate-600 dark:text-white max-w-sm font-medium">
                      Thanks for reaching out! I'll get back to you shortly.
                    </p>
                    <button 
                      onClick={() => setIsSuccess(false)}
                      className="mt-8 text-primary hover:underline text-sm font-medium"
                    >
                      Send another message
                    </button>
                  </motion.div>
                ) : (
                  <motion.form 
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit(onSubmit)} 
                    className="space-y-6"
                    noValidate
                  >
                    {sendError && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center font-bold">
                        {sendError}
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-white mb-1">Name</label>
                        <input 
                          {...register("name", { required: "Name is required" })}
                          className={`w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-[#0F172A]/80 border outline-none transition-all placeholder-slate-400 dark:placeholder-slate-400 text-slate-900 dark:text-white font-medium
                            ${errors.name 
                              ? 'border-red-500 focus:ring-red-500' 
                              : 'border-slate-300 dark:border-white/20 focus:border-primary focus:ring-1 focus:ring-primary'
                            }`}
                          placeholder="Your name"
                          disabled={isSubmitting}
                        />
                        <AnimatePresence>
                          {errors.name && (
                            <motion.span 
                              variants={errorVariant}
                              initial="hidden" animate="visible" exit="exit"
                              className="flex items-center gap-1 text-red-500 text-xs mt-1 font-medium"
                            >
                              <AlertCircle size={12} /> {errors.name.message}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-white mb-1">Email</label>
                        <input 
                          {...register("email", { 
                            required: "Email is required",
                            pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                              message: "Invalid email address"
                            }
                          })}
                          className={`w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-[#0F172A]/80 border outline-none transition-all placeholder-slate-400 dark:placeholder-slate-400 text-slate-900 dark:text-white font-medium
                            ${errors.email 
                              ? 'border-red-500 focus:ring-red-500' 
                              : 'border-slate-300 dark:border-white/20 focus:border-primary focus:ring-1 focus:ring-primary'
                            }`}
                          placeholder="you@example.com"
                          disabled={isSubmitting}
                        />
                        <AnimatePresence>
                          {errors.email && (
                            <motion.span 
                              variants={errorVariant}
                              initial="hidden" animate="visible" exit="exit"
                              className="flex items-center gap-1 text-red-500 text-xs mt-1 font-medium"
                            >
                              <AlertCircle size={12} /> {errors.email.message}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-white mb-1">Message</label>
                      <textarea 
                        {...register("message", { 
                          required: "Message is required",
                          minLength: {
                            value: 10,
                            message: "Message must be at least 10 characters"
                          }
                        })}
                        rows={4}
                        className={`w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-[#0F172A]/80 border outline-none transition-all placeholder-slate-400 dark:placeholder-slate-400 text-slate-900 dark:text-white font-medium resize-none
                          ${errors.message 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-slate-300 dark:border-white/20 focus:border-primary focus:ring-1 focus:ring-primary'
                          }`}
                        placeholder="Tell me about your project or opportunity..."
                        disabled={isSubmitting}
                      />
                      <AnimatePresence>
                        {errors.message && (
                          <motion.span 
                            variants={errorVariant}
                            initial="hidden" animate="visible" exit="exit"
                            className="flex items-center gap-1 text-red-500 text-xs mt-1 font-medium"
                          >
                            <AlertCircle size={12} /> {errors.message.message}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    <button 
                      disabled={isSubmitting}
                      className="w-full py-4 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-lg shadow-lg hover:shadow-[0_0_20px_rgba(45,212,191,0.4)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={20} className="animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          Send to Hasnain <Send size={18} />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Contact;