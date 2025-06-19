// utils/mockChats.ts

export type ChatMessage = {
  id: string;
  sender: 'me' | 'other';
  text: string;
  timestamp: string;
  read?: boolean;
};

export type ChatPreview = {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  avatar: string;
  unreadCount?: number;
};

export const mockChatPreviews: ChatPreview[] = [
  {
    id: 'chat1',
    name: 'Alice Wonderland',
    lastMessage: 'Hey, are you free tomorrow?',
    timestamp: '10:30 AM',
    avatar: 'https://i.pravatar.cc/100?img=32',
    unreadCount: 2,
  },
  {
    id: 'chat2',
    name: 'Bob The Builder',
    lastMessage: 'The project deadline is approaching fast!',
    timestamp: 'Yesterday',
    avatar: 'https://i.pravatar.cc/100?img=23',
  },
  {
    id: 'chat3',
    name: 'Team Alpha',
    lastMessage: 'Meeting rescheduled to 3 PM.',
    timestamp: 'Tuesday',
    avatar: 'https://i.pravatar.cc/100?img=66',
    unreadCount: 5,
  },
  {
    id: 'chat4',
    name: 'Charlie Chaplin',
    lastMessage: 'Can you send me the latest report?',
    timestamp: 'Mon',
    avatar: 'https://i.pravatar.cc/100?img=12',
  },
  {
    id: 'chat5',
    name: 'David Beckham',
    lastMessage: 'Awesome goal!',
    timestamp: '08/01/2024',
    avatar: 'https://i.pravatar.cc/100?img=45',
  },
  {
    id: 'chat6',
    name: 'Eve & Frank',
    lastMessage: 'Don\'t forget our dinner tonight!',
    timestamp: '11:55 AM',
    avatar: 'https://i.pravatar.cc/100?img=50',
    unreadCount: 1,
  },
  {
    id: 'chat7',
    name: 'Product Team',
    lastMessage: 'New feature deployed!',
    timestamp: '09:00 AM',
    avatar: 'https://i.pravatar.cc/100?img=70',
  },
  {
    id: 'chat8',
    name: 'Family Chat',
    lastMessage: 'Happy birthday, grandma!',
    timestamp: 'Sun',
    avatar: 'https://i.pravatar.cc/100?img=55',
  },
];

export const mockChatMessages: { [chatId: string]: ChatMessage[] } = {
  chat1: [
    { id: 'msg1', sender: 'other', text: 'Hey, Alice! Long time no see. How are you doing?', timestamp: '10:28 AM' },
    { id: 'msg2', sender: 'me', text: 'I\'m doing great, thanks for asking! Just finished a big project.', timestamp: '10:29 AM', read: true },
    { id: 'msg3', sender: 'other', text: 'That\'s awesome! Congratulations. Are you free tomorrow? I was thinking we could catch up.', timestamp: '10:30 AM' },
    { id: 'msg4', sender: 'me', text: 'Yeah, I am! What\'s up?', timestamp: '10:30 AM', read: false },
    { id: 'msg5', sender: 'other', text: 'Great! Want to grab coffee around 2 PM?', timestamp: '10:31 AM' },
  ],
  chat2: [
    { id: 'msg6', sender: 'other', text: 'Hey Bob, just a reminder about the project deadline. It\'s approaching fast!', timestamp: 'Yesterday' },
    { id: 'msg7', sender: 'me', text: 'Got it, thanks for the heads up! I\'m finalizing the last module now.', timestamp: 'Yesterday', read: true },
    { id: 'msg8', sender: 'other', text: 'Perfect! Let me know if you run into any issues.', timestamp: 'Yesterday' },
  ],
  chat3: [
    { id: 'msg9', sender: 'other', text: 'Attention Team Alpha: Meeting rescheduled to 3 PM in Conference Room B. Please confirm your availability.', timestamp: 'Tuesday' },
    { id: 'msg10', sender: 'me', text: 'Confirmed. Thanks for the update!', timestamp: 'Tuesday', read: true },
    { id: 'msg11', sender: 'other', text: 'Confirmed as well!', timestamp: 'Tuesday' },
    { id: 'msg12', sender: 'other', text: 'Ok, see you there.', timestamp: 'Tuesday' },
  ],
  chat4: [
    { id: 'msg13', sender: 'me', text: 'Hi Charlie, hope you\'re doing well. Could you send me the latest report on the Q3 performance?', timestamp: 'Mon', read: true },
    { id: 'msg14', sender: 'other', text: 'Sure thing! I\'ll send it over in the next hour.', timestamp: 'Mon' },
  ],
  chat5: [
    { id: 'msg15', sender: 'other', text: 'Did you see that amazing goal last night?!', timestamp: '08/01/2024' },
    { id: 'msg16', sender: 'me', text: 'Absolutely! Beckham still got it. What a strike!', timestamp: '08/01/2024', read: true },
  ],
  chat6: [
    { id: 'msg17', sender: 'other', text: 'Hey, don\'t forget our dinner tonight at 7 PM!', timestamp: '11:50 AM' },
    { id: 'msg18', sender: 'me', text: 'Almost slipped my mind! Thanks for the reminder, I\'ll be there.', timestamp: '11:55 AM', read: false },
  ],
  chat7: [
    { id: 'msg19', sender: 'other', text: 'Great news everyone! The new feature has officially been deployed to production. Check it out!', timestamp: '09:00 AM' },
    { id: 'msg20', sender: 'me', text: 'Fantastic work team! Looks very smooth. Well done!', timestamp: '09:05 AM', read: true },
  ],
  chat8: [
    { id: 'msg21', sender: 'other', text: 'Happy birthday, grandma! 🎉 Sending you all our love.', timestamp: 'Sun' },
    { id: 'msg22', sender: 'me', text: 'Yes, happy birthday! We miss you! 🎂', timestamp: 'Sun', read: true },
  ],
};