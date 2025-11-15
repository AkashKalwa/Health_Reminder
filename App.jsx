import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Check, Droplet, Bell, Calendar, Clock, Award, Filter, Search, Moon, Sun, Activity, BarChart3, History, X, Download, Settings, Mic, Volume2, Mail, Phone, Trophy, Star, Upload, LogIn, LogOut, Eye, EyeOff, User, TrendingUp, Zap, Palette } from 'lucide-react';
import dbService from './services/indexedDB';
import confetti from 'canvas-confetti';


export default function HealthReminderDashboard() {
  // Core state
  const [reminders, setReminders] = useState([]);
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal] = useState(8);
  const [showAddForm, setShowAddForm] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [streak, setStreak] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showWaterSettings, setShowWaterSettings] = useState(false);
  const [waterReminderEnabled, setWaterReminderEnabled] = useState(false);
  const [waterReminderInterval, setWaterReminderInterval] = useState(60);
  const [lastWaterReminder, setLastWaterReminder] = useState(Date.now());
  
  // Voice Assistant
  const [isListening, setIsListening] = useState(false);
  const [voiceCommand, setVoiceCommand] = useState('');
  
  // Settings & Customization
  const [showSettings, setShowSettings] = useState(false);
  const [notificationSound, setNotificationSound] = useState('default');
  const [notificationVolume, setNotificationVolume] = useState(50);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [theme, setTheme] = useState('ocean');
  const [fontSize, setFontSize] = useState('medium');
  const [highContrast, setHighContrast] = useState(false);
  
  // Authentication
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // Import/Export
  const [showImport, setShowImport] = useState(false);
  
  // Gamification
  const [achievements, setAchievements] = useState([]);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [showAchievements, setShowAchievements] = useState(false);
  
  // Advanced Filters
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [savedFilters, setSavedFilters] = useState([]);
  const [filterName, setFilterName] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Calendar & Snooze
  const [calendarSync, setCalendarSync] = useState(false);
  const [snoozeData, setSnoozeData] = useState({});
  
  // Database initialization
  const [dbInitialized, setDbInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const notificationCheckInterval = useRef(null);
  const waterReminderCheckInterval = useRef(null);
  const activeNotifications = useRef(new Set());
  const recognitionRef = useRef(null);
  const snoozeTimers = useRef({});

  const [newReminder, setNewReminder] = useState({
    name: '',
    time: '',
    date: new Date().toISOString().split('T')[0],
    isDaily: false,
    type: 'medicine',
    priority: 'medium',
    notes: ''
  });

  // Theme configurations
  const themes = {
    ocean: { primary: 'from-cyan-500 to-blue-600', secondary: 'from-teal-400 to-cyan-500', bg: 'from-cyan-50 via-blue-50 to-indigo-100' },
    forest: { primary: 'from-green-500 to-emerald-600', secondary: 'from-lime-400 to-green-500', bg: 'from-green-50 via-emerald-50 to-teal-100' },
    sunset: { primary: 'from-orange-500 to-red-600', secondary: 'from-yellow-400 to-orange-500', bg: 'from-orange-50 via-red-50 to-pink-100' },
    lavender: { primary: 'from-purple-500 to-pink-600', secondary: 'from-violet-400 to-purple-500', bg: 'from-purple-50 via-pink-50 to-rose-100' }
  };

  const currentTheme = themes[theme];

  // Achievement definitions
  const achievementList = [
    { id: 'first_task', name: 'Getting Started', description: 'Complete your first task', icon: '🎯', pointsRequired: 1 },
    { id: 'water_week', name: 'Hydration Hero', description: 'Reach water goal for 7 days', icon: '💧', pointsRequired: 50 },
    { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🔥', pointsRequired: 70 },
    { id: 'streak_30', name: 'Month Master', description: 'Maintain a 30-day streak', icon: '👑', pointsRequired: 300 },
    { id: 'complete_100', name: 'Century Club', description: 'Complete 100 tasks', icon: '💯', pointsRequired: 1000 },
    { id: 'level_5', name: 'Rising Star', description: 'Reach Level 5', icon: '⭐', pointsRequired: 500 },
    { id: 'level_10', name: 'Health Champion', description: 'Reach Level 10', icon: '🏆', pointsRequired: 1000 }
  ];

  // Initialize database and check login
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        await dbService.init();
        setDbInitialized(true);
        
        // Check if user is logged in
        const userId = await dbService.getCurrentUserId();
        if (userId) {
          setCurrentUserId(userId);
          setIsLoggedIn(true);
          await loadUserData(userId);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Load user data from database
  const loadUserData = async (userId) => {
    try {
      const userData = await dbService.getUserData(userId);
      if (userData) {
        setUsername(userData.username);
        setTheme(userData.settings?.theme || 'ocean');
        setFontSize(userData.settings?.fontSize || 'medium');
        setHighContrast(userData.settings?.highContrast || false);
        setNotificationSound(userData.settings?.notificationSound || 'default');
        setNotificationVolume(userData.settings?.notificationVolume || 50);
        setPoints(userData.stats?.points || 0);
        setLevel(userData.stats?.level || 1);
        setStreak(userData.stats?.streak || 0);
        setTotalCompleted(userData.stats?.totalCompleted || 0);
        setWaterIntake(userData.stats?.waterIntake || 0);
        setAchievements(userData.achievements || []);
        setSavedFilters(userData.savedFilters || []);
      }

      // Load reminders
      const allReminders = await dbService.getAllReminders();
      setReminders(allReminders);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  // Handle registration
  const handleRegister = async () => {
    if (!username || !email || !password) {
      speak('Please fill in all fields');
      return;
    }

    const result = await dbService.registerUser(username, email, password);
    if (result.success) {
      setIsLoggedIn(true);
      setShowRegister(false);
      await loadUserData(result.userId);
      speak(`Welcome ${username}! Your account has been created`);
    } else {
      speak(result.error || 'Registration failed');
      alert(result.error || 'Registration failed');
    }
  };

  // Handle login
  const handleLogin = async () => {
    if (!username || !password) {
      speak('Please enter username and password');
      return;
    }

    const result = await dbService.loginUser(username, password);
    if (result.success) {
      setIsLoggedIn(true);
      setShowLogin(false);
      const userId = await dbService.getCurrentUserId();
      await loadUserData(userId);
      speak(`Welcome back ${username}`);
    } else {
      speak(result.error || 'Login failed');
      alert(result.error || 'Invalid credentials');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await dbService.logoutUser();
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setEmail('');
    setReminders([]);
    setCurrentUserId(null);
    speak('Logged out successfully');
  };

  // Save data to database whenever it changes
  useEffect(() => {
    const saveData = async () => {
      if (!isLoggedIn || !dbInitialized) return;

      try {
        await dbService.updateStats({
          points,
          level,
          streak,
          totalCompleted,
          waterIntake,
          waterGoal
        });

        await dbService.updateSettings({
          theme,
          fontSize,
          highContrast,
          notificationSound,
          notificationVolume,
          emailNotifications,
          smsNotifications,
          waterReminderEnabled,
          waterReminderInterval
        });
      } catch (error) {
        console.error('Failed to save data:', error);
      }
    };

    saveData();
  }, [points, level, streak, totalCompleted, waterIntake, theme, fontSize, highContrast, 
      notificationSound, notificationVolume, isLoggedIn, dbInitialized]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const command = event.results[0][0].transcript.toLowerCase();
        setVoiceCommand(command);
        handleVoiceCommand(command);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Voice command handler
  const handleVoiceCommand = (command) => {
    speak('Processing your command');
    
    if (command.includes('add reminder') || command.includes('create reminder')) {
      setShowAddForm(true);
      speak('Opening reminder form');
    } else if (command.includes('add water')) {
      addWater();
      speak('Added a glass of water');
    } else if (command.includes('show history')) {
      setShowHistory(true);
      speak('Showing your history');
    } else if (command.includes('show charts')) {
      setShowCharts(true);
      speak('Showing analytics');
    } else if (command.includes('complete task') || command.includes('mark complete')) {
      if (reminders.length > 0) {
        const firstIncomplete = reminders.find(r => !r.completed);
        if (firstIncomplete) {
          toggleReminder(firstIncomplete.id);
          speak(`Marked ${firstIncomplete.name} as complete`);
        }
      }
    } else if (command.includes('dark mode')) {
      setDarkMode(!darkMode);
      speak(`${darkMode ? 'Light' : 'Dark'} mode activated`);
    } else {
      speak('Command not recognized. Try saying add reminder, add water, or show history');
    }
  };

  // Text-to-speech
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = notificationVolume / 100;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Start voice listening
  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
      speak('Listening for your command');
    }
  };

  // Play notification sound
  const playNotificationSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const volume = notificationVolume / 100;
    gainNode.gain.setValueAtTime(volume * 0.3, audioContext.currentTime);
    
    if (notificationSound === 'urgent') {
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
    } else if (notificationSound === 'gentle') {
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    } else if (notificationSound === 'default') {
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    }
    
    if (notificationSound !== 'none') {
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    }
  };

  // Add points and check achievements
  const addPoints = async (amount) => {
    const newPoints = points + amount;
    setPoints(newPoints);
    
    const newLevel = Math.floor(newPoints / 100) + 1;
    if (newLevel > level) {
      setLevel(newLevel);
      speak(`Congratulations! You've reached level ${newLevel}`);
      
      if (newLevel === 5 && !achievements.find(a => a.id === 'level_5')) {
        unlockAchievement('level_5');
      } else if (newLevel === 10 && !achievements.find(a => a.id === 'level_10')) {
        unlockAchievement('level_10');
      }
    }
    
    // Check other achievements
    if (totalCompleted === 1 && !achievements.find(a => a.id === 'first_task')) {
      unlockAchievement('first_task');
    } else if (totalCompleted === 100 && !achievements.find(a => a.id === 'complete_100')) {
      unlockAchievement('complete_100');
    }
    
    if (streak === 7 && !achievements.find(a => a.id === 'streak_7')) {
      unlockAchievement('streak_7');
    } else if (streak === 30 && !achievements.find(a => a.id === 'streak_30')) {
      unlockAchievement('streak_30');
    }
  };

  const unlockAchievement = async (achievementId) => {
    const achievement = achievementList.find(a => a.id === achievementId);
    if (achievement && !achievements.find(a => a.id === achievementId)) {
      const newAchievement = { ...achievement, unlockedAt: new Date().toISOString() };
      setAchievements(prev => [...prev, newAchievement]);
      
      if (dbInitialized && isLoggedIn) {
        await dbService.addAchievement(newAchievement);
      }
      
      speak(`Achievement unlocked: ${achievement.name}`);
    }
  };

  // Save/Load filters
  const saveFilter = async () => {
    if (filterName.trim()) {
      const filter = { name: filterName, priority: priorityFilter, status: statusFilter, date: dateFilter };
      setSavedFilters(prev => [...prev, filter]);
      
      if (dbInitialized && isLoggedIn) {
        await dbService.saveFilter(filter);
      }
      
      setFilterName('');
      speak('Filter preset saved');
    }
  };

  const loadFilter = (filter) => {
    setPriorityFilter(filter.priority);
    setStatusFilter(filter.status);
    setDateFilter(filter.date);
    speak('Filter preset loaded');
  };

  // Snooze reminder
  const snoozeReminder = (id, minutes) => {
    const snoozeUntil = new Date(Date.now() + minutes * 60000);
    setSnoozeData(prev => ({ ...prev, [id]: snoozeUntil }));
    
    snoozeTimers.current[id] = setTimeout(() => {
      setSnoozeData(prev => {
        const newData = { ...prev };
        delete newData[id];
        return newData;
      });
      const reminder = reminders.find(r => r.id === id);
      if (reminder) showNotification(reminder);
    }, minutes * 60000);
    
    speak(`Reminder snoozed for ${minutes} minutes`);
  };

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setNotificationsEnabled(permission === 'granted');
      });
    } else if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  // Notification checking
  useEffect(() => {
    if (!notificationsEnabled) return;

    notificationCheckInterval.current = setInterval(() => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const currentDate = now.toISOString().split('T')[0];
      
      reminders.forEach(reminder => {
        const reminderKey = `${reminder.id}-${currentDate}`;
        const isSnoozed = snoozeData[reminder.id] && new Date(snoozeData[reminder.id]) > now;
        
        if (!reminder.completed && reminder.time === currentTime && !isSnoozed) {
          const reminderDate = reminder.date || currentDate;
          if (reminder.isDaily || reminderDate === currentDate) {
            if (!activeNotifications.current.has(reminderKey)) {
              activeNotifications.current.add(reminderKey);
              showNotification(reminder);
              playNotificationSound();
            }
          }
        }
        
        if (reminder.completed && activeNotifications.current.has(reminderKey)) {
          activeNotifications.current.delete(reminderKey);
        }
      });
    }, 30000);

    return () => {
      if (notificationCheckInterval.current) {
        clearInterval(notificationCheckInterval.current);
      }
    };
  }, [reminders, notificationsEnabled, snoozeData]);

  const showNotification = (reminder) => {
    if (Notification.permission === 'granted' && !reminder.completed) {
      new Notification('⏰ Health Reminder', {
        body: `Time for: ${reminder.name}\n${reminder.notes ? `Note: ${reminder.notes}` : ''}`,
        icon: '💊',
        tag: reminder.id.toString(),
        requireInteraction: true
      });
      
      if (emailNotifications && userEmail) {
        console.log(`Email notification sent to ${userEmail}`);
      }
      if (smsNotifications && userPhone) {
        console.log(`SMS notification sent to ${userPhone}`);
      }
    }
  };

  const convert24to12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const addReminder = async () => {
    if (newReminder.name && newReminder.time) {
      const reminderData = {
        ...newReminder,
        completed: false
      };
      
      if (dbInitialized && isLoggedIn) {
        const result = await dbService.createReminder(reminderData);
        if (result.success) {
          const allReminders = await dbService.getAllReminders();
          setReminders(allReminders);
          speak('Reminder added successfully');
        }
      }
      
      setNewReminder({ 
        name: '', 
        time: '', 
        date: new Date().toISOString().split('T')[0],
        isDaily: false, 
        type: 'medicine', 
        priority: 'medium', 
        notes: '' 
      });
      setShowAddForm(false);
    }
  };

  const toggleReminder = async (id) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    const newCompleted = !reminder.completed;
    
    if (newCompleted) {

      confetti({
        particleCount: 200,
        spread: 120,
        angle: 60,
        origin: { x: 0 }
      });

      // Right burst
      confetti({
        particleCount: 200,
        spread: 120,
        angle: 120,
        origin: { x: 1 }
      });

      const pointsEarned = reminder.priority === 'high' ? 15 : reminder.priority === 'medium' ? 10 : 5;
      addPoints(pointsEarned);
      setTotalCompleted(prev => prev + 1);
      setStreak(prev => prev + 1);
      
      const currentDate = new Date().toISOString().split('T')[0];
      const reminderKey = `${reminder.id}-${currentDate}`;
      activeNotifications.current.delete(reminderKey);
      
      speak('Task completed! Great job!');
    }

    if (dbInitialized && isLoggedIn) {
      await dbService.updateReminder(id, { 
        completed: newCompleted,
        completedAt: newCompleted ? new Date().toISOString() : null
      });
      const allReminders = await dbService.getAllReminders();
      setReminders(allReminders);
    }
  };

  const deleteReminder = async (id) => {
    if (dbInitialized && isLoggedIn) {
      await dbService.deleteReminder(id);
      const allReminders = await dbService.getAllReminders();
      setReminders(allReminders);
      speak('Reminder deleted');
    }
  };

  const addWater = () => {
    if (waterIntake < waterGoal * 2) {
      setWaterIntake(waterIntake + 1);
      if (waterIntake + 1 >= waterGoal) {
        addPoints(10);
      }
    }
  };

  const removeWater = () => {
    if (waterIntake > 0) {
      setWaterIntake(waterIntake - 1);
    }
  };

  const clearHistory = async () => {
    if (confirm('Are you sure you want to clear all reminders?')) {
      if (dbInitialized && isLoggedIn) {
        await dbService.deleteAllReminders();
        setReminders([]);
        setHistory([]);
        speak('All reminders cleared');
      }
    }
  };

  const downloadExcel = () => {
    const headers = ['Name', 'Time', 'Date', 'Type', 'Priority', 'Completed', 'Daily', 'Notes'];
    const rows = reminders.map(h => [
      h.name,
      convert24to12Hour(h.time),
      h.date ? new Date(h.date).toLocaleDateString() : 'N/A',
      h.type,
      h.priority,
      h.completed ? 'Yes' : 'No',
      h.isDaily ? 'Yes' : 'No',
      h.notes || ''
    ]);
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `health-reminders-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    speak('Downloading Excel file');
  };

  // Apply filters
  const filteredReminders = reminders
    .filter(r => filterType === 'all' || r.type === filterType)
    .filter(r => priorityFilter === 'all' || r.priority === priorityFilter)
    .filter(r => statusFilter === 'all' || (statusFilter === 'completed' ? r.completed : !r.completed))
    .filter(r => {
      if (dateFilter === 'today') {
        return r.date === new Date().toISOString().split('T')[0];
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return new Date(r.date) >= weekAgo;
      }
      return true;
    })
    .filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const completedReminders = reminders.filter(r => r.completed).length;
  const totalReminders = reminders.length;
  const waterProgress = (waterIntake / waterGoal) * 100;

  // Font size classes
  const fontSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  const bgClass = darkMode ? 'bg-gray-900' : `bg-gradient-to-br ${currentTheme.bg}`;
  const cardClass = darkMode ? 'bg-gray-800 text-white' : `bg-gradient-to-br from-white to-${theme}-50 text-gray-800`;
  const inputClass = darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-800 border-cyan-200';

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading your health dashboard...</p>
        </div>
      </div>
    );
  }

  // Login/Register screens
  if (!isLoggedIn) {
    if (showRegister) {
      return (
        <div className={`min-h-screen ${bgClass} flex items-center justify-center p-4`}>
          <div className={`${cardClass} rounded-3xl shadow-2xl p-8 max-w-md w-full`}>
            <div className="text-center mb-8">
              <div className={`bg-gradient-to-r ${currentTheme.primary} p-4 rounded-2xl inline-block mb-4`}>
                <User className="text-white" size={48} />
              </div>
              <h1 className="text-3xl font-bold mb-2">Create Account</h1>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Join Health Dashboard</p>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full p-4 border rounded-xl ${inputClass}`}
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full p-4 border rounded-xl ${inputClass}`}
              />
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full p-4 border rounded-xl ${inputClass} pr-12`}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <button
                onClick={handleRegister}
                className={`w-full bg-gradient-to-r ${currentTheme.primary} text-white p-4 rounded-xl font-semibold hover:scale-105 transition-transform`}
              >
                <User className="inline mr-2" size={20} />
                Register
              </button>
              <button
                onClick={() => {
                  setShowRegister(false);
                  setShowLogin(true);
                }}
                className="w-full text-center text-gray-600 hover:text-gray-800"
              >
                Already have an account? Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (showLogin) {
      return (
        <div className={`min-h-screen ${bgClass} flex items-center justify-center p-4`}>
          <div className={`${cardClass} rounded-3xl shadow-2xl p-8 max-w-md w-full`}>
            <div className="text-center mb-8">
              <div className={`bg-gradient-to-r ${currentTheme.primary} p-4 rounded-2xl inline-block mb-4`}>
                <User className="text-white" size={48} />
              </div>
              <h1 className="text-3xl font-bold mb-2">Welcome Back!</h1>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Login to continue</p>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full p-4 border rounded-xl ${inputClass}`}
              />
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full p-4 border rounded-xl ${inputClass} pr-12`}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <button
                onClick={handleLogin}
                className={`w-full bg-gradient-to-r ${currentTheme.primary} text-white p-4 rounded-xl font-semibold hover:scale-105 transition-transform`}
              >
                <LogIn className="inline mr-2" size={20} />
                Login
              </button>
              <button
                onClick={() => {
                  setShowLogin(false);
                  setShowRegister(true);
                }}
                className="w-full text-center text-gray-600 hover:text-gray-800"
              >
                Don't have an account? Register
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Welcome screen
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center p-4`}>
        <div className={`${cardClass} rounded-3xl shadow-2xl p-8 max-w-2xl w-full text-center`}>
          <div className={`bg-gradient-to-r ${currentTheme.primary} p-6 rounded-2xl inline-block mb-6`}>
            <Bell className="text-white" size={64} />
          </div>
          <h1 className="text-5xl font-bold mb-4">Health Dashboard</h1>
          <p className="text-xl text-gray-600 mb-8">
            Your personal health reminder assistant with voice control, analytics, and gamification!
          </p>
          
          <div className="grid md:grid-cols-3 gap-4 mb-8 text-left">
            <div className="p-4 bg-cyan-50 rounded-xl">
              <Bell className="text-cyan-600 mb-2" size={32} />
              <h3 className="font-bold mb-1">Smart Reminders</h3>
              <p className="text-sm text-gray-600">Never miss your medication or tasks</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl">
              <Droplet className="text-blue-600 mb-2" size={32} />
              <h3 className="font-bold mb-1">Water Tracking</h3>
              <p className="text-sm text-gray-600">Stay hydrated throughout the day</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl">
              <Trophy className="text-purple-600 mb-2" size={32} />
              <h3 className="font-bold mb-1">Achievements</h3>
              <p className="text-sm text-gray-600">Earn points and unlock rewards</p>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setShowRegister(true)}
              className={`px-8 py-4 bg-gradient-to-r ${currentTheme.primary} text-white rounded-xl font-semibold hover:scale-105 transition-transform text-lg`}
            >
              Get Started
            </button>
            <button
              onClick={() => setShowLogin(true)}
              className="px-8 py-4 bg-white border-2 border-cyan-500 text-cyan-600 rounded-xl font-semibold hover:scale-105 transition-transform text-lg"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard (rest of your existing JSX with minor modifications)
  return (
    <div className={`min-h-screen ${bgClass} p-4 transition-colors duration-300 ${fontSizeClasses[fontSize]} ${highContrast ? 'contrast-150' : ''}`}>
      {/* Your existing dashboard JSX from here - keeping all the existing UI */}
      {/* Header */}
      <div className={`${cardClass} rounded-3xl shadow-2xl p-6 mb-6`}>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`bg-gradient-to-r ${currentTheme.primary} p-3 rounded-2xl`}>
              <Bell className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Health Dashboard</h1>
              {isLoggedIn && <p className="text-sm mt-1">Welcome, {privacyMode ? '****' : username}!</p>}
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={startListening}
              className={`p-3 rounded-xl ${isListening ? 'bg-red-500 animate-pulse' : `bg-gradient-to-r ${currentTheme.primary}`} text-white hover:scale-110 transition-transform`}
              title="Voice Assistant"
            >
              <Mic size={24} />
            </button>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-xl">
              <Star size={20} />
              <span className="font-semibold">L{level}</span>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl">
              <Zap size={20} />
              <span className="font-semibold">{points}pts</span>
            </div>
            
            <button
              onClick={() => setShowAchievements(!showAchievements)}
              className={`p-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:scale-110 transition-transform`}
              title="View Achievements"
            >
              <Trophy size={24} />
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 rounded-xl bg-gradient-to-r ${currentTheme.secondary} text-white hover:scale-110 transition-transform`}
              title="Settings"
            >
              <Settings size={24} />
            </button>
            
            <button
              onClick={() => setShowCharts(!showCharts)}
              className={`p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:scale-110 transition-transform`}
              title="Analytics"
            >
              <BarChart3 size={24} />
            </button>
            
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-3 rounded-xl ${darkMode ? 'bg-yellow-500' : 'bg-indigo-600'} text-white hover:scale-110 transition-transform`}
            >
              {darkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            
            <button
              onClick={handleLogout}
              className="p-3 rounded-xl bg-red-500 text-white hover:scale-110 transition-transform"
              title="Logout"
            >
              <LogOut size={24} />
            </button>
          </div>
        </div>
        
        {voiceCommand && (
          <div className="mt-4 p-3 bg-blue-100 text-blue-700 rounded-xl">
            🎤 Command: "{voiceCommand}"
          </div>
        )}
        
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Level {level} Progress</span>
            <span>{points % 100}/100 to Level {level + 1}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`bg-gradient-to-r ${currentTheme.primary} h-3 rounded-full transition-all duration-500`}
              style={{ width: `${(points % 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`${cardClass} rounded-2xl shadow-xl p-4 hover:scale-105 transition-transform`}>
          <div className="flex items-center gap-3">
            <Activity className="text-teal-600" size={24} />
            <div>
              <p className="text-xs opacity-70">Total Tasks</p>
              <p className="text-2xl font-bold">{totalReminders}</p>
            </div>
          </div>
        </div>
        
        <div className={`${cardClass} rounded-2xl shadow-xl p-4 hover:scale-105 transition-transform`}>
          <div className="flex items-center gap-3">
            <Check className="text-green-600" size={24} />
            <div>
              <p className="text-xs opacity-70">Completed</p>
              <p className="text-2xl font-bold">{completedReminders}</p>
            </div>
          </div>
        </div>
        
        <div className={`${cardClass} rounded-2xl shadow-xl p-4 hover:scale-105 transition-transform`}>
          <div className="flex items-center gap-3">
            <Droplet className="text-cyan-600" size={24} />
            <div>
              <p className="text-xs opacity-70">Water</p>
              <p className="text-2xl font-bold">{waterIntake}/{waterGoal}</p>
            </div>
          </div>
        </div>
        
        <div className={`${cardClass} rounded-2xl shadow-xl p-4 hover:scale-105 transition-transform`}>
          <div className="flex items-center gap-3">
            <Award className="text-orange-600" size={24} />
            <div>
              <p className="text-xs opacity-70">Streak</p>
              <p className="text-2xl font-bold">{streak} 🔥</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Reminders Section */}
        <div className={`lg:col-span-2 ${cardClass} rounded-3xl shadow-2xl p-6`}>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar size={28} />
              My Reminders
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAdvancedFilters(true)}
                className={`px-4 py-2 bg-gradient-to-r ${currentTheme.secondary} text-white rounded-xl hover:scale-105 transition-transform flex items-center gap-2`}
              >
                <Filter size={18} />
                Filters
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className={`px-4 py-2 bg-gradient-to-r ${currentTheme.primary} text-white rounded-xl hover:scale-105 transition-transform flex items-center gap-2`}
              >
                <Plus size={20} />
                Add
              </button>
            </div>
          </div>

          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search reminders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 p-3 border rounded-xl ${inputClass}`}
            />
          </div>

          {showAddForm && (
            <div className={`mb-4 p-6 ${darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-teal-50 to-cyan-50'} rounded-2xl`}>
              <h3 className="font-semibold mb-4 text-lg">Add New Reminder</h3>
              <input
                type="text"
                placeholder="Reminder name"
                value={newReminder.name}
                onChange={(e) => setNewReminder({ ...newReminder, name: e.target.value })}
                className={`w-full p-3 mb-3 border rounded-xl ${inputClass}`}
              />
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="time"
                  value={newReminder.time}
                  onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                  className={`w-full p-3 border rounded-xl ${inputClass}`}
                />
                <input
                  type="date"
                  value={newReminder.date}
                  onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                  className={`w-full p-3 border rounded-xl ${inputClass}`}
                />
              </div>
              <select
                value={newReminder.type}
                onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value })}
                className={`w-full p-3 mb-3 border rounded-xl ${inputClass}`}
              >
                <option value="medicine">💊 Medicine</option>
                <option value="task">✅ Task</option>
                <option value="exercise">🏃 Exercise</option>
              </select>
              <select
                value={newReminder.priority}
                onChange={(e) => setNewReminder({ ...newReminder, priority: e.target.value })}
                className={`w-full p-3 mb-3 border rounded-xl ${inputClass}`}
              >
                <option value="high">🔴 High Priority</option>
                <option value="medium">🟡 Medium Priority</option>
                <option value="low">🟢 Low Priority</option>
              </select>
              <textarea
                placeholder="Add notes (optional)"
                value={newReminder.notes}
                onChange={(e) => setNewReminder({ ...newReminder, notes: e.target.value })}
                className={`w-full p-3 mb-3 border rounded-xl ${inputClass} h-20`}
              />
              <label className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={newReminder.isDaily}
                  onChange={(e) => setNewReminder({ ...newReminder, isDaily: e.target.checked })}
                  className="w-5 h-5"
                />
                <span>🔄 Repeat Daily</span>
              </label>
              <div className="flex gap-3">
                <button 
                  onClick={addReminder} 
                  className={`flex-1 bg-gradient-to-r ${currentTheme.primary} text-white p-3 rounded-xl hover:scale-105 transition-transform font-semibold`}
                >
                  ✨ Add Reminder
                </button>
                <button 
                  onClick={() => setShowAddForm(false)} 
                  className="px-6 bg-gray-300 rounded-xl hover:scale-105 transition-transform"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {filteredReminders.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto mb-4 text-gray-400" size={64} />
                <p className="text-gray-500">No reminders found</p>
              </div>
            ) : (
              filteredReminders.map((reminder) => {
                const isSnoozed = snoozeData[reminder.id] && new Date(snoozeData[reminder.id]) > new Date();
                return (
                  <div
                    key={reminder.id}
                    className={`p-4 rounded-xl border-l-4 ${
                      reminder.completed ? 'border-green-500 bg-green-50' :
                      reminder.priority === 'high' ? 'border-red-500 bg-red-50' :
                      reminder.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-green-500 bg-green-50'
                    } ${darkMode ? 'bg-opacity-20' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          onClick={() => toggleReminder(reminder.id)}
                          className={`p-2 rounded-lg mt-1 ${
                            reminder.completed ? 'bg-green-500 text-white' : 'bg-gray-200'
                          } hover:scale-110 transition-transform`}
                        >
                          <Check size={18} />
                        </button>
                        <div className="flex-1">
                          <p className={`font-semibold ${reminder.completed ? 'line-through opacity-60' : ''}`}>
                            {privacyMode ? '****' : reminder.name}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded-full flex items-center gap-1">
                              <Clock size={12} />
                              {convert24to12Hour(reminder.time)}
                            </span>
                            {reminder.isDaily && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                🔄 Daily
                              </span>
                            )}
                            {isSnoozed && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                                💤 Snoozed
                              </span>
                            )}
                          </div>
                          {reminder.notes && !privacyMode && (
                            <p className="text-sm mt-2 text-gray-600 italic">📝 {reminder.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!reminder.completed && (
                          <div className="relative group">
                            <button className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:scale-110 transition-transform">
                              <Clock size={18} />
                            </button>
                            <div className="absolute right-0 top-full mt-2 bg-white shadow-xl rounded-xl p-2 hidden group-hover:block z-10 w-48">
                              <button
                                onClick={() => snoozeReminder(reminder.id, 5)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                              >
                                ⏰ 5 minutes
                              </button>
                              <button
                                onClick={() => snoozeReminder(reminder.id, 15)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                              >
                                ⏰ 15 minutes
                              </button>
                              <button
                                onClick={() => snoozeReminder(reminder.id, 30)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                              >
                                ⏰ 30 minutes
                              </button>
                              <button
                                onClick={() => snoozeReminder(reminder.id, 60)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                              >
                                ⏰ 1 hour
                              </button>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => deleteReminder(reminder.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:scale-110 transition-transform"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {totalReminders > 0 && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold">Overall Progress</span>
                <span className="font-bold">{completedReminders}/{totalReminders} ({totalReminders > 0 ? Math.round((completedReminders / totalReminders) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`bg-gradient-to-r ${currentTheme.primary} h-4 rounded-full transition-all duration-500`}
                  style={{ width: `${totalReminders > 0 ? (completedReminders / totalReminders) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Water Intake Section */}
        <div className={`${cardClass} rounded-3xl shadow-2xl p-6`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Droplet className="text-cyan-500" />
              Water Tracker
            </h2>
          </div>

          <div className="text-center mb-6">
            <div className="text-7xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
              {waterIntake}
            </div>
            <div className="text-sm mt-1">of {waterGoal} glasses</div>
          </div>

          <div className="flex gap-3 mb-6">
            <button
              onClick={removeWater}
              className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-4 rounded-xl hover:scale-105 transition-transform font-semibold"
            >
              − Remove
            </button>
            <button
              onClick={addWater}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-4 rounded-xl hover:scale-105 transition-transform font-semibold"
            >
              + Add Glass
            </button>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold">Daily Goal</span>
              <span className="font-bold">{Math.min(100, Math.round(waterProgress))}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-5">
              <div
                className={`h-5 rounded-full transition-all duration-500 ${
                  waterProgress >= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : `bg-gradient-to-r ${currentTheme.primary}`
                }`}
                style={{ width: `${Math.min(100, waterProgress)}%` }}
              />
            </div>
            {waterProgress >= 100 && (
              <div className="mt-3 p-3 bg-green-100 rounded-xl text-center">
                <p className="text-green-700 font-semibold">🎉 Goal Completed! 🎉</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[...Array(waterGoal)].map((_, i) => (
              <div
                key={i}
                className={`aspect-square rounded-xl flex items-center justify-center transition-all duration-300 ${
                  i < waterIntake 
                    ? `bg-gradient-to-br ${currentTheme.primary} scale-110 shadow-lg` 
                    : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}
              >
                <Droplet
                  size={24}
                  className={i < waterIntake ? 'text-white' : 'text-gray-400'}
                />
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-cyan-50 rounded-xl">
            <p className="text-sm text-cyan-700 text-center">
              💡 <strong>Tip:</strong> Drink water regularly throughout the day!
            </p>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${cardClass} rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Settings size={28} />
                Settings
              </h2>
              <button onClick={() => setShowSettings(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Theme Selection */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Palette size={20} />
                  Theme
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(themes).map(t => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`p-4 rounded-xl border-2 ${theme === t ? 'border-blue-500' : 'border-gray-300'} capitalize`}
                    >
                      <div className={`w-full h-8 rounded-lg bg-gradient-to-r ${themes[t].primary} mb-2`}></div>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Notification Settings */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Bell size={20} />
                  Notifications
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block mb-2">Notification Sound</label>
                    <select
                      value={notificationSound}
                      onChange={(e) => setNotificationSound(e.target.value)}
                      className={`w-full p-3 border rounded-xl ${inputClass}`}
                    >
                      <option value="default">Default</option>
                      <option value="urgent">Urgent</option>
                      <option value="gentle">Gentle</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block mb-2 flex items-center gap-2">
                      <Volume2 size={18} />
                      Volume: {notificationVolume}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={notificationVolume}
                      onChange={(e) => setNotificationVolume(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              
              {/* Accessibility */}
              <div>
                <h3 className="font-semibold mb-3">Accessibility</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block mb-2">Font Size</label>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value)}
                      className={`w-full p-3 border rounded-xl ${inputClass}`}
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={highContrast}
                      onChange={(e) => setHighContrast(e.target.checked)}
                      className="w-5 h-5"
                    />
                    High Contrast Mode
                  </label>
                </div>
              </div>
              
              {/* Privacy */}
              <div>
                <h3 className="font-semibold mb-3">Privacy</h3>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={privacyMode}
                    onChange={(e) => setPrivacyMode(e.target.checked)}
                    className="w-5 h-5"
                  />
                  Privacy Mode (Hide sensitive data)
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Achievements Modal */}
      {showAchievements && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${cardClass} rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Trophy size={28} className="text-yellow-500" />
                Achievements ({achievements.length}/{achievementList.length})
              </h2>
              <button onClick={() => setShowAchievements(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="grid gap-4">
              {achievementList.map(achievement => {
                const unlocked = achievements.find(a => a.id === achievement.id);
                return (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded-xl border-2 ${unlocked ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300 bg-gray-100 opacity-50'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{achievement.name}</h3>
                        <p className="text-sm text-gray-600">{achievement.description}</p>
                        {unlocked && (
                          <p className="text-xs text-green-600 mt-1">
                            Unlocked: {new Date(unlocked.unlockedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {unlocked && <Check size={24} className="text-green-500" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${cardClass} rounded-3xl p-6 max-w-md w-full`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Advanced Filters</h2>
              <button onClick={() => setShowAdvancedFilters(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-semibold">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className={`w-full p-3 border rounded-xl ${inputClass}`}
                >
                  <option value="all">All Types</option>
                  <option value="medicine">Medicine</option>
                  <option value="task">Task</option>
                  <option value="exercise">Exercise</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 font-semibold">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className={`w-full p-3 border rounded-xl ${inputClass}`}
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              
              <div>
                <label className="block mb-2 font-semibold">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full p-3 border rounded-xl ${inputClass}`}
                >
                  <option value="all">All</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              
              <div>
                <label className="block mb-2 font-semibold">Date Range</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className={`w-full p-3 border rounded-xl ${inputClass}`}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                </select>
              </div>
              
              <div>
                <label className="block mb-2 font-semibold">Save Filter Preset</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Filter name"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className={`flex-1 p-3 border rounded-xl ${inputClass}`}
                  />
                  <button
                    onClick={saveFilter}
                    className={`px-4 py-3 bg-gradient-to-r ${currentTheme.primary} text-white rounded-xl hover:scale-105 transition-transform`}
                  >
                    Save
                  </button>
                </div>
              </div>
              
              {savedFilters.length > 0 && (
                <div>
                  <label className="block mb-2 font-semibold">Saved Presets</label>
                  <div className="space-y-2">
                    {savedFilters.map((filter, idx) => (
                      <button
                        key={idx}
                        onClick={() => loadFilter(filter)}
                        className={`w-full p-3 border rounded-xl ${inputClass} hover:bg-blue-50 text-left`}
                      >
                        {filter.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      {showCharts && (
        <div className={`${cardClass} rounded-3xl shadow-2xl p-6 mb-6`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp size={28} />
              Analytics & Insights
            </h2>
            <button onClick={() => setShowCharts(false)}>
              <X size={24} />
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-4">Completion by Type</h3>
              <div className="space-y-3">
                {['medicine', 'exercise', 'task'].map(type => {
                  const count = reminders.filter(r => r.type === type && r.completed).length;
                  const total = reminders.filter(r => r.type === type).length;
                  const percent = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{type}</span>
                        <span className="font-semibold">{count}/{total} ({Math.round(percent)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`bg-gradient-to-r ${currentTheme.primary} h-3 rounded-full transition-all duration-500`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">AI Insights</h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-sm">💡 You complete {completedReminders > 0 ? Math.round((completedReminders / totalReminders) * 100) : 0}% of your tasks!</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <p className="text-sm">🎯 Best performance: {reminders.filter(r => r.priority === 'high' && r.completed).length} high priority tasks completed!</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <p className="text-sm">⭐ Keep going! You're on a {streak}-day streak!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Section */}
      {showHistory && (
        <div className={`${cardClass} rounded-3xl shadow-2xl p-6 mt-6`}>
          <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <History size={28} />
              All Reminders ({reminders.length})
            </h2>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={downloadExcel}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:scale-105 transition-transform text-sm flex items-center gap-2"
              >
                <Download size={16} />
                Excel
              </button>
              <button
                onClick={clearHistory}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:scale-105 transition-transform text-sm"
              >
                Clear All
              </button>
              <button onClick={() => setShowHistory(false)}>
                <X size={24} />
              </button>
            </div>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {reminders.map(reminder => (
              <div
                key={reminder.id}
                className={`p-4 rounded-xl border-l-4 ${
                  reminder.completed ? 'border-green-500 bg-green-50' :
                  reminder.priority === 'high' ? 'border-red-500 bg-red-50' :
                  reminder.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-green-500 bg-green-50'
                } ${darkMode ? 'bg-opacity-20' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{privacyMode ? '****' : reminder.name}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded-full flex items-center gap-1">
                        <Clock size={12} />
                        {convert24to12Hour(reminder.time)}
                      </span>
                      {reminder.date && (
                        <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(reminder.date).toLocaleDateString()}
                        </span>
                      )}
                      {reminder.isDaily && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                          🔄 Daily
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        reminder.completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {reminder.completed ? '✓ Completed' : '○ Pending'}
                      </span>
                    </div>
                    {reminder.notes && !privacyMode && (
                      <p className="text-sm mt-2 text-gray-600 italic">📝 {reminder.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {reminders.length === 0 && (
              <p className="text-gray-500 text-center py-12">No reminders yet</p>
            )}
          </div>
        </div>
      )}

      {/* Achievement Banner */}
      {totalCompleted >= 10 && (
        <div className={`${cardClass} rounded-3xl shadow-2xl p-6 mt-6`}>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4 rounded-2xl">
              <Award className="text-white" size={40} />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Achievement Unlocked! 🏆</h3>
              <p className="mt-1">You've completed {totalCompleted} tasks! Keep up the amazing work!</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Help */}
      <div className={`${cardClass} rounded-3xl shadow-2xl p-6 mt-6`}>
        <h3 className="text-xl font-bold mb-4">🎮 Quick Guide</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold mb-2">Voice Commands:</p>
            <ul className="space-y-1 text-gray-600">
              <li>• "Add reminder" - Open reminder form</li>
              <li>• "Add water" - Log water intake</li>
              <li>• "Show history" - View all reminders</li>
              <li>• "Show charts" - View analytics</li>
              <li>• "Complete task" - Mark task as done</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Features:</p>
            <ul className="space-y-1 text-gray-600">
              <li>• 🎤 Voice control for hands-free use</li>
              <li>• ⏰ Snooze reminders (5-60 min)</li>
              <li>• 🏆 Earn points & unlock achievements</li>
              <li>• 📊 Advanced analytics & insights</li>
              <li>• 🎨 4 beautiful themes</li>
              <li>• 💾 All data saved in browser</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-8 pb-4">
        <p className="text-sm opacity-70">
          Total Points: {points} | Level: {level} | Achievements: {achievements.length}/{achievementList.length}
        </p>
        <p className="text-xs opacity-50 mt-2">
          Logged in as {privacyMode ? '****' : username} | Data saved in browser ✓
        </p>
      </div>
    </div>
  );
}