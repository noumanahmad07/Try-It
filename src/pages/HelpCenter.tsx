import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, HelpCircle, Mail, Phone, MessageCircle, Book, ExternalLink } from 'lucide-react';
import GlassCard from '../components/GlassCard';

export default function HelpCenter() {
  const navigate = useNavigate();

  const helpCategories = [
    {
      title: 'Getting Started',
      icon: Book,
      items: [
        { title: 'How to use Virtual Try-On', content: 'Learn the basics of our AI-powered virtual try-on feature.' },
        { title: 'Taking your first photo', content: 'Tips for capturing the perfect photo for best results.' },
        { title: 'Choosing garments', content: 'How to select and upload clothing items for try-on.' }
      ]
    },
    {
      title: 'Features',
      icon: HelpCircle,
      items: [
        { title: 'AI Fashion Designer', content: 'Create custom outfits with our AI designer.' },
        { title: 'Hairstyle Try-On', content: 'Try different hairstyles virtually before making changes.' },
        { title: 'My Looks', content: 'Save and organize your favorite try-on results.' },
        { title: 'Trending Fashion', content: 'Discover what\'s popular in the fashion world.' }
      ]
    },
    {
      title: 'Account & Settings',
      icon: HelpCircle,
      items: [
        { title: 'Managing Your Profile', content: 'Update your information and profile picture.' },
        { title: 'Privacy Settings', content: 'Control your data and privacy preferences.' },
        { title: 'Notification Preferences', content: 'Choose how you want to be notified.' },
        { title: 'Camera Settings', content: 'Optimize photo quality and capture settings.' }
      ]
    },
    {
      title: 'Troubleshooting',
      icon: HelpCircle,
      items: [
        { title: 'Try-On Not Working', content: 'Common issues and solutions for virtual try-on problems.' },
        { title: 'Photo Quality Issues', content: 'Tips for better photo capture and results.' },
        { title: 'App Performance', content: 'How to improve app speed and responsiveness.' },
        { title: 'Login Problems', content: 'Solutions for authentication and account access issues.' }
      ]
    }
  ];

  const contactOptions = [
    {
      icon: Mail,
      label: 'Email Support',
      value: 'support@zephora.com',
      description: 'Get help via email'
    },
    {
      icon: MessageCircle,
      label: 'Live Chat',
      value: 'chat',
      description: 'Chat with our support team'
    },
    {
      icon: Phone,
      label: 'Phone Support',
      value: '+1-800-ZEPHORA',
      description: 'Call us for immediate assistance'
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="max-w-[390px] mx-auto px-6 py-4">
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link to="/settings">
            <motion.button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          </Link>
          <h1 className="text-xl font-semibold">Help Center</h1>
        </motion.div>
      </div>

      <div className="max-w-[390px] mx-auto px-6 mt-6 space-y-4">
        {/* Search Bar */}
        <GlassCard className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for help..."
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
            <HelpCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
        </GlassCard>

        {/* Help Categories */}
        {helpCategories.map((category, index) => (
          <div key={category.title}>
            <GlassCard className="p-6">
              <motion.h3
              className="text-lg font-semibold mb-4 flex items-center gap-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <category.icon className="w-5 h-5 text-purple-400" />
              {category.title}
            </motion.h3>
            
            <div className="space-y-4">
              {category.items.map((item, itemIndex) => (
                <motion.div
                  key={item.title}
                  className="p-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: (index * 10 + itemIndex) * 0.05,
                    duration: 0.3
                  }}
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  <h4 className="text-sm font-medium mb-2">{item.title}</h4>
                  <p className="text-sm text-gray-400">{item.content}</p>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>
        ))}

        {/* Contact Support */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Contact Support</h3>
          <p className="text-sm text-gray-400 mb-6">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          
          <div className="space-y-3">
            {contactOptions.map((option) => (
              <motion.button
                key={option.label}
                className="w-full flex items-center gap-3 p-4 rounded-lg hover:bg-white/5 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <option.icon className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs text-gray-400">{option.description}</p>
                </div>
                <div className="text-right">
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
              </motion.button>
            ))}
          </div>
        </GlassCard>

        {/* Quick Links */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
          <div className="space-y-3">
            <Link to="/privacy" className="block">
              <motion.div
                className="p-3 rounded-lg hover:bg-white/5 transition-colors"
                whileHover={{ scale: 1.02 }}
              >
                <p className="text-sm font-medium">Privacy Policy</p>
                <p className="text-xs text-gray-400">Learn how we protect your data</p>
              </motion.div>
            </Link>
            
            <Link to="/terms" className="block">
              <motion.div
                className="p-3 rounded-lg hover:bg-white/5 transition-colors"
                whileHover={{ scale: 1.02 }}
              >
                <p className="text-sm font-medium">Terms of Service</p>
                <p className="text-xs text-gray-400">Our terms and conditions</p>
              </motion.div>
            </Link>
            
            <a href="https://status.zephora.com" target="_blank" rel="noopener noreferrer" className="block">
              <motion.div
                className="p-3 rounded-lg hover:bg-white/5 transition-colors"
                whileHover={{ scale: 1.02 }}
              >
                <p className="text-sm font-medium">System Status</p>
                <p className="text-xs text-gray-400">Check if there are any outages</p>
              </motion.div>
            </a>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
