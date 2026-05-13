import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, User, Send, CheckCircle } from 'lucide-react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate form submission
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', message: '' });
    }, 3000);
  };

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-5xl font-bold gradient-header bg-clip-text text-transparent mb-4">
            Get In Touch
          </h1>
          <p className="text-muted-foreground text-xl">
            Have questions or feedback? We&apos;d love to hear from you!
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-card rounded-lg p-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">Send us a message</h2>
              
              {submitted ? (
                <motion.div
                  className="flex flex-col items-center justify-center py-12"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <CheckCircle className="w-16 h-16 text-primary mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">Message Sent!</h3>
                  <p className="text-muted-foreground text-center">
                    Thank you for reaching out. We&apos;ll get back to you soon.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name Field */}
                  <div>
                    <label className="block text-foreground font-semibold mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Name
                      </div>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="text-input"
                      placeholder="Your name"
                    />
                  </div>

                  {/* Email Field */}
                  <div>
                    <label className="block text-foreground font-semibold mb-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </div>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="text-input"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  {/* Message Field */}
                  <div>
                    <label className="block text-foreground font-semibold mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Message
                      </div>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className="text-input min-h-32 resize-none"
                      placeholder="Tell us what's on your mind..."
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="bg-card rounded-lg p-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">Contact Information</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-lg">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">Email</h3>
                    <p className="text-muted-foreground">medora9990@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">Live Chat</h3>
                    <p className="text-muted-foreground">Available 24/7 for Pro users</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg p-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">FAQ</h2>
              <p className="text-muted-foreground mb-4">
                Before reaching out, check our frequently asked questions. You might find your answer there!
              </p>
              <button className="btn-secondary w-full">
                Visit FAQ
              </button>
            </div>

            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-8 text-white">
              <h2 className="text-2xl font-bold mb-4">Join Our Community</h2>
              <p className="mb-6">
                Connect with fellow movie enthusiasts and stay updated with the latest features and releases.
              </p>
              <div className="flex gap-4">
                <button className="bg-white text-purple-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all">
                  Discord
                </button>
                <button className="bg-white text-purple-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all">
                  Twitter
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Contact;

