/*
  # Create Messaging System with Media Sharing

  1. New Tables
    - `conversations`
      - `id` (uuid, primary key)
      - `customer_id` (uuid) - Foreign key to customers
      - `repair_shop_id` (uuid) - Foreign key to repair_shops
      - `subject` (text) - Conversation subject
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid) - Foreign key to conversations
      - `sender_id` (uuid) - ID of sender (either customer or repair shop)
      - `sender_type` (text) - Type of sender ('customer' or 'repair_shop')
      - `content` (text) - Message content
      - `read_at` (timestamptz) - When message was read
      - `created_at` (timestamptz)
    
    - `message_media`
      - `id` (uuid, primary key)
      - `message_id` (uuid) - Foreign key to messages
      - `media_type` (text) - Type of media ('image' or 'video')
      - `media_url` (text) - URL to media file
      - `thumbnail_url` (text) - URL to thumbnail (for videos)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for read/write access
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  repair_shop_id UUID REFERENCES repair_shops(id) ON DELETE CASCADE,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'repair_shop')),
  content TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create message_media table
CREATE TABLE IF NOT EXISTS message_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_repair_shop_id ON conversations(repair_shop_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, sender_type);
CREATE INDEX IF NOT EXISTS idx_message_media_message_id ON message_media(message_id);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Repair shops can view their conversations"
  ON conversations FOR SELECT
  USING (
    repair_shop_id IN (
      SELECT id FROM repair_shops
    )
  );

CREATE POLICY "Repair shops can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    repair_shop_id IN (
      SELECT id FROM repair_shops
    )
  );

CREATE POLICY "Repair shops can update their conversations"
  ON conversations FOR UPDATE
  USING (
    repair_shop_id IN (
      SELECT id FROM repair_shops
    )
  );

-- RLS Policies for messages
CREATE POLICY "Participants can view conversation messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (
        conversations.customer_id IN (SELECT id FROM customers) OR
        conversations.repair_shop_id IN (SELECT id FROM repair_shops)
      )
    )
  );

CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (
        conversations.customer_id IN (SELECT id FROM customers) OR
        conversations.repair_shop_id IN (SELECT id FROM repair_shops)
      )
    )
  );

-- RLS Policies for message_media
CREATE POLICY "Participants can view message media"
  ON message_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = message_media.message_id
      AND (
        c.customer_id IN (SELECT id FROM customers) OR
        c.repair_shop_id IN (SELECT id FROM repair_shops)
      )
    )
  );

CREATE POLICY "Participants can add media to messages"
  ON message_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = message_media.message_id
      AND (
        c.customer_id IN (SELECT id FROM customers) OR
        c.repair_shop_id IN (SELECT id FROM repair_shops)
      )
    )
  );