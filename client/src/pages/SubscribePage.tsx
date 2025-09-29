import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subscribeApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';

interface Message {
  subject: string;
  data: string;
  timestamp: string;
  headers?: Record<string, string>;
  type?: 'connected' | 'completed' | 'error';
}

interface Subscription {
  subject: string;
  queueGroup?: string;
  maxMessages?: number;
  isActive: boolean;
  messages: Message[];
  eventSource: EventSource | null;
  connectionStatus?: 'connected' | 'disconnected' | 'connecting';
  lastStatusUpdate?: string;
}

export function SubscribePage() {
  const [subject, setSubject] = useState('');
  const [queueGroup, setQueueGroup] = useState('');
  const [maxMessages, setMaxMessages] = useState<number | ''>('');
  const [subscriptions, setSubscriptions] = useState<Record<string, Subscription>>({});
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Get subject suggestions
  const { data: subjectsData } = useQuery({
    queryKey: ['subscribe-subjects'],
    queryFn: subscribeApi.getSubjects,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (activeTab && subscriptions[activeTab]?.messages.length > 0) {
      const container = messagesContainerRef.current;
      if (container && !showJumpToLatest) {
        setTimeout(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  }, [subscriptions, activeTab, showJumpToLatest]);

  // Get visible messages for active tab
  const activeMessages = useMemo(() => {
    if (!activeTab || !subscriptions[activeTab]) return [];
    return subscriptions[activeTab].messages.slice(-200); // Show last 200 messages
  }, [subscriptions, activeTab]);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
    setShowJumpToLatest(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const shouldShowButton = distanceFromBottom > 100;

    setShowJumpToLatest(shouldShowButton);
  };

  const startSubscription = (subscriptionSubject: string, subscriptionQueueGroup?: string, subscriptionMaxMessages?: number) => {
    const key = subscriptionQueueGroup ? `${subscriptionSubject}:${subscriptionQueueGroup}` : subscriptionSubject;
    
    // Build URL with query parameters
    let url = `/api/nats/subscribe/messages/${encodeURIComponent(subscriptionSubject)}`;
    const params = new URLSearchParams();
    if (subscriptionQueueGroup) {
      params.append('queue_group', subscriptionQueueGroup);
    }
    if (subscriptionMaxMessages && subscriptionMaxMessages > 0) {
      params.append('max_messages', subscriptionMaxMessages.toString());
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setSubscriptions(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          subject: subscriptionSubject,
          queueGroup: subscriptionQueueGroup,
          maxMessages: subscriptionMaxMessages,
          isActive: true,
          messages: prev[key]?.messages || [],
          eventSource,
        },
      }));
    };

    eventSource.onmessage = (event) => {
      try {
        const messageData = JSON.parse(event.data);
        
        setSubscriptions(prev => {
          const currentSub = prev[key] || {
            subject: subscriptionSubject,
            queueGroup: subscriptionQueueGroup,
            maxMessages: subscriptionMaxMessages,
            isActive: true,
            messages: [],
            eventSource,
          };

          // Handle connection/status messages
          if (messageData.type) {
            return {
              ...prev,
              [key]: {
                ...currentSub,
                connectionStatus: messageData.type as 'connected' | 'disconnected' | 'connecting',
                lastStatusUpdate: messageData.timestamp,
              },
            };
          }

          // Handle data messages
          if (messageData.data !== undefined) {
            return {
              ...prev,
              [key]: {
                ...currentSub,
                messages: [...currentSub.messages, messageData],
              },
            };
          }

          return prev;
        });
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error for subject:', subscriptionSubject, error);
      stopSubscription(key);
    };
  };

  const stopSubscription = (key: string) => {
    const subscription = subscriptions[key];
    if (subscription?.eventSource) {
      subscription.eventSource.close();
    }

    setSubscriptions(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isActive: false,
        eventSource: null,
      },
    }));

    if (activeTab === key) {
      const remainingKeys = Object.keys(subscriptions).filter(k => k !== key && subscriptions[k].isActive);
      setActiveTab(remainingKeys[0] || null);
    }
  };

  const handleSubscribe = () => {
    if (!subject.trim()) return;

    startSubscription(subject, queueGroup || undefined, maxMessages || undefined);
    
    // Set as active tab if first subscription
    const key = queueGroup ? `${subject}:${queueGroup}` : subject;
    if (!activeTab) {
      setActiveTab(key);
    }

    // Clear form
    setSubject('');
    setQueueGroup('');
    setMaxMessages('');
  };

  // Clean up subscriptions on unmount
  useEffect(() => {
    return () => {
      Object.values(subscriptions).forEach(sub => {
        if (sub.eventSource) {
          sub.eventSource.close();
        }
      });
    };
  }, []);

  const activeSubscriptions = Object.entries(subscriptions).filter(([, sub]) => sub.isActive);

  return (
    <div className="p-3 h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Subscribe to Messages</h2>
        <p className="text-sm text-gray-600">Listen to NATS subjects and view incoming messages in real-time</p>
      </div>

      {/* Subscription Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <AutocompleteInput
              value={subject}
              onChange={setSubject}
              placeholder="e.g., events.*, user.login"
              suggestions={subjectsData?.subjects || []}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Queue Group</label>
            <Input
              value={queueGroup}
              onChange={(e) => setQueueGroup(e.target.value)}
              placeholder="optional"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Messages</label>
            <Input
              type="number"
              value={maxMessages}
              onChange={(e) => setMaxMessages(e.target.value ? parseInt(e.target.value) : '')}
              placeholder="unlimited"
              min="1"
              className="w-full"
            />
          </div>

          <div>
            <Button
              onClick={handleSubscribe}
              disabled={!subject.trim()}
              className="w-full"
            >
              Subscribe
            </Button>
          </div>
        </div>
      </div>

      {/* Active Subscriptions */}
      {activeSubscriptions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 flex-1 flex flex-col min-h-0">
          {/* Subscription Tabs */}
          <div className="border-b border-gray-200 px-4">
            <div className="flex space-x-1 overflow-x-auto py-2">
              {activeSubscriptions.map(([key, subscription]) => {
                const isSelected = activeTab === key;
                const displayName = subscription.queueGroup 
                  ? `${subscription.subject} (${subscription.queueGroup})`
                  : subscription.subject;

                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`
                      px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap flex-shrink-0 flex items-center gap-2
                      ${isSelected
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`w-2 h-2 rounded-full ${subscription.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="truncate max-w-[200px]">{displayName}</span>
                    <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                      {subscription.messages.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        stopSubscription(key);
                      }}
                      className="ml-1 text-gray-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Messages Area */}
          {activeTab && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages */}
              <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-2"
                style={{ minHeight: 0 }}
              >
                {activeMessages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <div className="text-sm">Waiting for messages on subject: <code className="bg-gray-100 px-1 py-0.5 rounded">{subscriptions[activeTab].subject}</code></div>
                    {subscriptions[activeTab].queueGroup && (
                      <div className="text-xs mt-1">Queue group: <code className="bg-gray-100 px-1 py-0.5 rounded">{subscriptions[activeTab].queueGroup}</code></div>
                    )}
                  </div>
                ) : (
                  activeMessages.map((message, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-medium text-gray-900">
                          {message.subject}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      
                      {message.data && (
                        <div className="mb-2">
                          <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words font-mono bg-white p-2 rounded border">
                            {message.data}
                          </pre>
                        </div>
                      )}

                      {message.headers && Object.keys(message.headers).length > 0 && (
                        <div className="text-xs text-gray-600">
                          <div className="font-medium mb-1">Headers:</div>
                          <div className="space-y-1">
                            {Object.entries(message.headers).map(([key, value]) => (
                              <div key={key} className="flex">
                                <span className="font-mono bg-gray-100 px-1 rounded mr-2">{key}:</span>
                                <span className="font-mono">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Jump to Latest Button */}
              {showJumpToLatest && (
                <div className="absolute bottom-4 right-4">
                  <Button
                    onClick={scrollToBottom}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                  >
                    ↓ Jump to Latest
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {activeSubscriptions.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Subscriptions</h3>
          <p className="text-gray-500 mb-4">
            Start subscribing to NATS subjects to monitor real-time message flow.
          </p>
          <div className="text-sm text-gray-400">
            <div className="mb-2">Features available:</div>
            <ul className="space-y-1">
              <li>• Real-time message monitoring</li>
              <li>• Subject wildcards and pattern matching</li>
              <li>• Queue group subscriptions</li>
              <li>• Message limit controls</li>
              <li>• Header inspection</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}