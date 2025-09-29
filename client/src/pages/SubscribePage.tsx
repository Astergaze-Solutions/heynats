import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { subscribeApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface Message {
  subject: string;
  data: string;
  timestamp: string;
  headers?: Record<string, string>;
  type?: 'connected' | 'completed' | 'error';
  reply?: string; // For request messages that need replies
}

interface Subscription {
  subject: string;
  queueGroup?: string;
  maxMessages?: number;
  subscriptionType: 'regular' | 'queue' | 'reply' | 'request-handler';
  isActive: boolean;
  messages: Message[];
  eventSource: EventSource | null;
  connectionStatus?: 'connected' | 'disconnected' | 'connecting';
  lastStatusUpdate?: string;
  autoReply?: boolean; // For request handlers
  replyTemplate?: string; // Template for auto-replies
}

export function SubscribePage() {
  // Regular subscription state
  const [subject, setSubject] = useState('');
  const [queueGroup, setQueueGroup] = useState('');
  const [maxMessages, setMaxMessages] = useState<number | ''>('');

  // Reply subscription state
  const [replySubject, setReplySubject] = useState('');
  const [replyMaxMessages, setReplyMaxMessages] = useState<number | ''>('');

  // Request handler state
  const [requestSubject, setRequestSubject] = useState('');
  const [requestQueueGroup, setRequestQueueGroup] = useState('');
  const [autoReply, setAutoReply] = useState(false);
  const [replyTemplate, setReplyTemplate] = useState('{"status": "received", "timestamp": "${timestamp}"}');

  // Common state
  const [subscriptions, setSubscriptions] = useState<Record<string, Subscription>>({});
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Reply state
  const [replyData, setReplyData] = useState('');
  const [selectedReplySubject, setSelectedReplySubject] = useState('');

  // Confirmation state
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<string | null>(null);

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: ({ replySubject, data }: { replySubject: string; data: string }) => 
      subscribeApi.sendReply(replySubject, data),
    onSuccess: () => {
      setReplyData('');
      setSelectedReplySubject('');
    },
  });

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

  const startSubscription = (
    subscriptionSubject: string, 
    subscriptionType: 'regular' | 'queue' | 'reply' | 'request-handler' = 'regular',
    subscriptionQueueGroup?: string, 
    subscriptionMaxMessages?: number,
    subscriptionAutoReply?: boolean,
    subscriptionReplyTemplate?: string
  ) => {
    let key = subscriptionSubject;
    if (subscriptionType === 'queue' && subscriptionQueueGroup) {
      key = `${subscriptionSubject}:${subscriptionQueueGroup}`;
    } else if (subscriptionType === 'reply') {
      key = `reply:${subscriptionSubject}`;
    } else if (subscriptionType === 'request-handler') {
      key = subscriptionQueueGroup ? `handler:${subscriptionSubject}:${subscriptionQueueGroup}` : `handler:${subscriptionSubject}`;
    }
    
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
          subscriptionType,
          isActive: true,
          messages: prev[key]?.messages || [],
          eventSource,
          autoReply: subscriptionAutoReply,
          replyTemplate: subscriptionReplyTemplate,
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
            subscriptionType,
            isActive: true,
            messages: [],
            eventSource,
            autoReply: subscriptionAutoReply,
            replyTemplate: subscriptionReplyTemplate,
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

  const handleDisconnectClick = (key: string) => {
    setShowDisconnectConfirm(key);
  };

  const confirmDisconnect = (key: string) => {
    stopSubscription(key);
    setShowDisconnectConfirm(null);
  };

  const handleDisconnectAll = () => {
    activeSubscriptions.forEach(([key]) => stopSubscription(key));
  };

  const handleSubscribe = () => {
    if (!subject.trim()) return;

    const subscriptionType = queueGroup ? 'queue' : 'regular';
    startSubscription(subject, subscriptionType, queueGroup || undefined, maxMessages || undefined);
    
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

  const handleReplySubscribe = () => {
    if (!replySubject.trim()) return;

    startSubscription(replySubject, 'reply', undefined, replyMaxMessages || undefined);
    
    const key = `reply:${replySubject}`;
    if (!activeTab) {
      setActiveTab(key);
    }

    setReplySubject('');
    setReplyMaxMessages('');
  };

  const handleRequestHandlerSubscribe = () => {
    if (!requestSubject.trim()) return;

    startSubscription(
      requestSubject, 
      'request-handler', 
      requestQueueGroup || undefined, 
      undefined, 
      autoReply, 
      replyTemplate
    );
    
    const key = requestQueueGroup ? `handler:${requestSubject}:${requestQueueGroup}` : `handler:${requestSubject}`;
    if (!activeTab) {
      setActiveTab(key);
    }

    setRequestSubject('');
    setRequestQueueGroup('');
    setAutoReply(false);
    setReplyTemplate('{"status": "received", "timestamp": "${timestamp}"}');
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
        <Tabs defaultValue="regular" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="regular">Regular/Queue</TabsTrigger>
            <TabsTrigger value="reply">Reply Subject</TabsTrigger>
            <TabsTrigger value="request-handler">Request Handler</TabsTrigger>
          </TabsList>

          {/* Regular/Queue Subscription Tab */}
          <TabsContent value="regular" className="space-y-4">
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
          </TabsContent>

          {/* Reply Subject Tab */}
          <TabsContent value="reply" className="space-y-4">
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  Subscribe to reply subjects to monitor responses in request-reply patterns. 
                  Use wildcards like "reply.{'>'}'" or specific patterns like "_INBOX.{'>'}"
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reply Subject Pattern *</label>
                  <AutocompleteInput
                    value={replySubject}
                    onChange={setReplySubject}
                    placeholder="e.g., _INBOX.>, reply.*"
                    suggestions={['_INBOX.>', 'reply.>', 'response.*', '*.reply']}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Messages</label>
                  <Input
                    type="number"
                    value={replyMaxMessages}
                    onChange={(e) => setReplyMaxMessages(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="unlimited"
                    min="1"
                    className="w-full"
                  />
                </div>

                <div>
                  <Button
                    onClick={handleReplySubscribe}
                    disabled={!replySubject.trim()}
                    className="w-full"
                  >
                    Subscribe to Replies
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Request Handler Tab */}
          <TabsContent value="request-handler" className="space-y-4">
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm text-green-800">
                  Subscribe to handle incoming requests and optionally send automatic replies.
                  Perfect for creating service endpoints and API handlers.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Request Subject *</label>
                  <AutocompleteInput
                    value={requestSubject}
                    onChange={setRequestSubject}
                    placeholder="e.g., api.*, service.user.*"
                    suggestions={subjectsData?.subjects || []}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Queue Group</label>
                  <Input
                    value={requestQueueGroup}
                    onChange={(e) => setRequestQueueGroup(e.target.value)}
                    placeholder="load balancing group"
                    className="w-full"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={autoReply}
                      onChange={(e) => setAutoReply(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Auto Reply</span>
                  </label>
                </div>
              </div>

              {autoReply && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reply Template (JSON)
                  </label>
                  <Textarea
                    value={replyTemplate}
                    onChange={(e) => setReplyTemplate(e.target.value)}
                    placeholder='{"status": "received", "timestamp": "${timestamp}"}'
                    className="min-h-[80px] font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use ${`{timestamp}`} for current time, ${`{subject}`} for request subject, ${`{data}`} for request data
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleRequestHandlerSubscribe}
                  disabled={!requestSubject.trim()}
                  className="flex-1"
                >
                  Start Request Handler
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Active Subscriptions */}
      {activeSubscriptions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 flex-1 flex flex-col min-h-0">
          {/* Subscription Tabs */}
          <div className="border-b border-gray-200 px-4">
            <div className="flex space-x-1 overflow-x-auto py-2">
              {activeSubscriptions.map(([key, subscription]) => {
                const isSelected = activeTab === key;
                const typePrefix = subscription.subscriptionType === 'reply' ? '📩' : 
                                  subscription.subscriptionType === 'request-handler' ? '⚙️' : 
                                  subscription.subscriptionType === 'queue' ? '👥' : '📡';
                const displayName = subscription.queueGroup 
                  ? `${typePrefix} ${subscription.subject} (${subscription.queueGroup})`
                  : `${typePrefix} ${subscription.subject}`;

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
                        handleDisconnectClick(key);
                      }}
                      className="ml-1 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-100 rounded-full transition-colors"
                      title="Disconnect subscription"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Messages Area */}
          {activeTab && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Subscription Controls Header */}
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${subscriptions[activeTab].isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                      <span className="text-sm font-medium text-gray-900">
                        {subscriptions[activeTab].subscriptionType === 'reply' ? 'Reply Subscription' : 
                         subscriptions[activeTab].subscriptionType === 'request-handler' ? 'Request Handler' : 
                         subscriptions[activeTab].subscriptionType === 'queue' ? 'Queue Subscription' : 'Regular Subscription'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Subject: <code className="bg-gray-200 px-1 py-0.5 rounded">{subscriptions[activeTab].subject}</code>
                      {subscriptions[activeTab].queueGroup && (
                        <span className="ml-2">
                          Queue: <code className="bg-gray-200 px-1 py-0.5 rounded">{subscriptions[activeTab].queueGroup}</code>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-gray-500">
                      {subscriptions[activeTab].messages.length} messages
                    </div>
                    {activeSubscriptions.length > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDisconnectAll}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                      >
                        Disconnect All
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDisconnectClick(activeTab)}
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-2"
                style={{ minHeight: 0 }}
              >
                {activeMessages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <div className="text-sm">
                      Waiting for {subscriptions[activeTab].subscriptionType === 'reply' ? 'reply messages' : 
                                  subscriptions[activeTab].subscriptionType === 'request-handler' ? 'requests' : 'messages'} on subject: 
                      <code className="bg-gray-100 px-1 py-0.5 rounded ml-1">{subscriptions[activeTab].subject}</code>
                    </div>
                    {subscriptions[activeTab].queueGroup && (
                      <div className="text-xs mt-1">Queue group: <code className="bg-gray-100 px-1 py-0.5 rounded">{subscriptions[activeTab].queueGroup}</code></div>
                    )}
                    <div className="text-xs mt-1 capitalize">
                      Type: {subscriptions[activeTab].subscriptionType.replace('-', ' ')}
                    </div>
                  </div>
                ) : (
                  activeMessages.map((message, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            {message.subject}
                          </div>
                          {message.reply && (
                            <div className="text-xs text-blue-600 font-mono">
                              Reply to: {message.reply}
                            </div>
                          )}
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

                      {/* Reply Button for Request Handler */}
                      {subscriptions[activeTab]?.subscriptionType === 'request-handler' && message.reply && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Quick Reply</label>
                              <Textarea
                                value={selectedReplySubject === message.reply ? replyData : ''}
                                onChange={(e) => {
                                  setReplyData(e.target.value);
                                  if (message.reply) setSelectedReplySubject(message.reply);
                                }}
                                placeholder='{"status": "success", "result": "..."}'
                                className="min-h-[60px] text-sm"
                                onFocus={() => {
                                  if (message.reply) setSelectedReplySubject(message.reply);
                                }}
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (message.reply) {
                                  replyMutation.mutate({ 
                                    replySubject: message.reply, 
                                    data: replyData 
                                  });
                                }
                              }}
                              disabled={!replyData.trim() || replyMutation.isPending}
                            >
                              {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                            </Button>
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
            <div className="mb-2">Subscription types available:</div>
            <ul className="space-y-1">
              <li>📡 <strong>Regular</strong> - Standard NATS subscriptions</li>
              <li>👥 <strong>Queue Group</strong> - Load balanced subscriptions</li>
              <li>📩 <strong>Reply Subject</strong> - Monitor reply messages</li>
              <li>⚙️ <strong>Request Handler</strong> - Handle requests with auto-reply</li>
            </ul>
            <div className="mt-3 mb-2">Features:</div>
            <ul className="space-y-1">
              <li>• Real-time message monitoring</li>
              <li>• Subject wildcards and pattern matching</li>
              <li>• Header inspection</li>
              <li>• Request-reply handling</li>
            </ul>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Disconnection
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to disconnect from subscription:
            </p>
            <div className="bg-gray-50 p-3 rounded mb-4">
              <div className="text-sm font-medium text-gray-900">
                {subscriptions[showDisconnectConfirm]?.subject}
              </div>
              {subscriptions[showDisconnectConfirm]?.queueGroup && (
                <div className="text-xs text-gray-500">
                  Queue: {subscriptions[showDisconnectConfirm].queueGroup}
                </div>
              )}
              <div className="text-xs text-gray-500 capitalize">
                Type: {subscriptions[showDisconnectConfirm]?.subscriptionType.replace('-', ' ')}
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-6">
              This will stop receiving messages and close the connection. You can always subscribe again later.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDisconnectConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => confirmDisconnect(showDisconnectConfirm)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}