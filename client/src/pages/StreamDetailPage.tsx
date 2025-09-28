import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { streamsApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { StatsCard } from '../components/StatsCard';
import { ArrowLeft, Play, Square, Download, BarChart3, HardDrive, Users, Hash, ChevronDown } from 'lucide-react';

interface SubjectSubscription {
  subject: string;
  isActive: boolean;
  messages: any[]; // Only data messages
  eventSource: EventSource | null;
  connectionStatus?: 'connected' | 'disconnected' | 'connecting';
  lastStatusUpdate?: string;
}

interface MessageEvent {
  subject: string;
  data?: any;
  timestamp: string;
  headers?: Record<string, string>;
  type?: string; // For connection/status messages
  stream?: string; // For connection/status messages
}

export function StreamDetailPage() {
  const { streamName } = useParams<{ streamName: string }>();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<Record<string, SubjectSubscription>>({});
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [selectedMessage, setSelectedMessage] = useState<MessageEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // New state for improved UX
  const [activeTab, setActiveTab] = useState<string>('');
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  // Virtualization refs
  const subjectsContainerRef = useRef<HTMLDivElement>(null);

  // Fetch stream details
  const { 
    data: stream, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['stream', streamName],
    queryFn: () => streamsApi.getStream(streamName!),
    enabled: !!streamName,
  });

  // Get subjects and active messages for virtualization (must be called before any early returns)
  const subjects = stream?.config?.subjects || [];
  
  // Get visible messages for active tab
  const activeMessages = useMemo(() => {
    if (!activeTab || !subscriptions[activeTab]) return [];
    return subscriptions[activeTab].messages.slice(-200); // Show last 200 messages
  }, [subscriptions, activeTab]);

  // Virtualization constants
  const SUBJECT_ITEM_HEIGHT = 80; // Approximate height of each subject item

  // Virtualize subjects list - MUST be called before any early returns
  const subjectsVirtualizer = useVirtualizer({
    count: subjects.length,
    getScrollElement: () => subjectsContainerRef.current,
    estimateSize: () => SUBJECT_ITEM_HEIGHT,
  });

  // Note: Removed message virtualization to fix scrolling issues
  // For better UX, we'll render the last 200 messages directly

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
    const shouldShowButton = distanceFromBottom > 100; // Show button if more than 100px from bottom
    
    setShowJumpToLatest(shouldShowButton);
  };

  // Initial scroll to bottom is handled by the auto-scroll effect

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        closeMessageModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isModalOpen]);

  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subject)) {
        newSet.delete(subject);
      } else {
        newSet.add(subject);
      }
      return newSet;
    });
  };

  const startSubscription = (subject: string) => {
    if (subscriptions[subject]?.isActive) return;

    const eventSource = new EventSource(
      `/api/nats/streams/${streamName}/subjects/${encodeURIComponent(subject)}/subscribe`
    );

    eventSource.onopen = () => {
      console.log(`Subscription started for subject: ${subject}`);
      setSubscriptions(prev => ({
        ...prev,
        [subject]: {
          subject,
          isActive: true,
          messages: prev[subject]?.messages || [],
          eventSource,
        },
      }));
    };

    eventSource.onmessage = (event) => {
      try {
        const messageData: MessageEvent = JSON.parse(event.data);
        
        setSubscriptions(prev => {
          const currentSub = prev[subject] || {
            subject,
            isActive: true,
            messages: [],
            eventSource,
          };

          // Handle connection/status messages (messages with 'type' field)
          if (messageData.type) {
            return {
              ...prev,
              [subject]: {
                ...currentSub,
                connectionStatus: messageData.type as 'connected' | 'disconnected' | 'connecting',
                lastStatusUpdate: messageData.timestamp,
              },
            };
          }
          
          // Handle data messages (messages with 'data' field)
          if (messageData.data !== undefined) {
            return {
              ...prev,
              [subject]: {
                ...currentSub,
                messages: [...currentSub.messages, messageData],
              },
            };
          }

          // If neither type nor data, just update the subscription without adding to messages
          return prev;
        });
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error for subject:', subject, error);
      stopSubscription(subject);
    };
  };

  const stopSubscription = (subject: string) => {
    const subscription = subscriptions[subject];
    if (subscription?.eventSource) {
      subscription.eventSource.close();
    }

    setSubscriptions(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        isActive: false,
        eventSource: null,
      },
    }));
  };

  const startSelectedSubscriptions = () => {
    selectedSubjects.forEach(subject => {
      startSubscription(subject);
    });
  };

  const stopAllSubscriptions = () => {
    Object.keys(subscriptions).forEach(subject => {
      stopSubscription(subject);
    });
  };

  const exportMessages = (subject: string) => {
    const messages = subscriptions[subject]?.messages || [];
    const dataStr = JSON.stringify(messages, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${subject}-messages.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openMessageModal = (message: MessageEvent) => {
    setSelectedMessage(message);
    setIsModalOpen(true);
  };

  const closeMessageModal = () => {
    setIsModalOpen(false);
    setSelectedMessage(null);
  };

  // Initialize active tab when subscriptions change
  useEffect(() => {
    const activeSubjects = Object.entries(subscriptions)
      .filter(([_, sub]) => sub.isActive && sub.messages.length > 0)
      .map(([subject]) => subject);
    
    if (activeSubjects.length > 0 && !activeTab) {
      setActiveTab(activeSubjects[0]); // Set first subject as active tab
    }
  }, [subscriptions, activeTab]);

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (activeTab && subscriptions[activeTab]?.messages.length > 0) {
      // Small delay to ensure DOM has updated
      const timeoutId = setTimeout(() => {
        const container = messagesContainerRef.current;
        if (container) {
          const { scrollTop, scrollHeight, clientHeight } = container;
          const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
          
          if (distanceFromBottom <= 100) {
            // User is near bottom, auto-scroll and hide button
            container.scrollTo({
              top: scrollHeight,
              behavior: 'smooth'
            });
            setShowJumpToLatest(false);
          } else {
            // User is not at bottom, show the jump button
            setShowJumpToLatest(true);
          }
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [subscriptions, activeTab]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(subscriptions).forEach(sub => {
        if (sub.eventSource) {
          sub.eventSource.close();
        }
      });
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-600 mb-4">Failed to load stream details</p>
        <Button onClick={() => navigate('/dashboard/streams')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Streams
        </Button>
      </div>
    );
  }

  const hasActiveSubscriptions = Object.values(subscriptions).some(sub => sub.isActive);


  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
        {/* Left Side - Main Content */}
        <div className="flex-1 overflow-y-auto lg:w-1/2">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/streams')}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            Stream: {stream.config?.name || 'Unknown'}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={startSelectedSubscriptions}
            disabled={selectedSubjects.size === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Selected ({selectedSubjects.size})
          </Button>
          <Button
            onClick={stopAllSubscriptions}
            disabled={!hasActiveSubscriptions}
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop All
          </Button>

        </div>
      </div>

      {/* Stream Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Messages"
          value={(stream.state?.messages || 0).toLocaleString()}
          icon={<BarChart3 className="w-4 h-4 text-blue-600" />}
        />
        <StatsCard
          title="Bytes"
          value={`${((stream.state?.bytes || 0) / 1024 / 1024).toFixed(2)} MB`}
          icon={<HardDrive className="w-4 h-4 text-green-600" />}
        />
        <StatsCard
          title="Consumers"
          value={(stream.state?.consumer_count || 0).toString()}
          icon={<Users className="w-4 h-4 text-purple-600" />}
        />
        <StatsCard
          title="Subjects"
          value={subjects.length.toString()}
          icon={<Hash className="w-4 h-4 text-orange-600" />}
        />
      </div>

      {/* Stream Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Stream Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Retention:</span> {stream.config?.retention || 'Unknown'}
          </div>
          <div>
            <span className="font-medium">Storage:</span> {stream.config?.storage || 'Unknown'}
          </div>
          <div>
            <span className="font-medium">Replicas:</span> {stream.config?.num_replicas || 0}
          </div>
          <div>
            <span className="font-medium">Max Messages:</span> {(stream.config?.max_msgs || 0).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Max Bytes:</span> {((stream.config?.max_bytes || 0) / 1024 / 1024).toFixed(2)} MB
          </div>
          <div>
            <span className="font-medium">Max Age:</span> {stream.config?.max_age ? `${stream.config.max_age}s` : 'No limit'}
          </div>
        </div>
      </div>

      {/* Virtualized Subjects List */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Subjects ({subjects.length})</h2>
          {hasActiveSubscriptions && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-700 rounded-full animate-pulse"></div>
              <span className="text-green-600">
                {Object.values(subscriptions).filter(sub => sub.isActive).length} active subscriptions
              </span>
            </div>
          )}
        </div>
        
        {subjects.length === 0 ? (
          <p className="text-gray-500">No subjects configured for this stream</p>
        ) : (
          <div 
            ref={subjectsContainerRef}
            className="relative h-96 overflow-auto border border-gray-200 rounded-lg"
          >
            <div style={{ height: subjectsVirtualizer.getTotalSize() }}>
              {subjectsVirtualizer.getVirtualItems().map((virtualItem) => {
                const subject = subjects[virtualItem.index];
                const subscription = subscriptions[subject];
                const isSelected = selectedSubjects.has(subject);
                const isActive = subscription?.isActive || false;
                const messageCount = subscription?.messages?.length || 0;

                return (
                  <div
                    key={virtualItem.key}
                    className={`absolute top-0 left-0 w-full flex items-center justify-between p-4 border-b transition-colors ${
                      isActive 
                        ? 'bg-green-50 border-green-200' 
                        : isSelected 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    style={{
                      height: virtualItem.size,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSubjectToggle(subject)}
                        disabled={isActive}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div>
                        <span className="font-medium text-gray-900 truncate max-w-xs block">{subject}</span>
                        {isActive && (
                          <div className="flex items-center gap-3 mt-1">
                            {/* Connection Status */}
                            <div className="flex items-center">
                              {subscription?.connectionStatus === 'connected' ? (
                                <>
                                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                  <span className="text-sm text-green-600">Connected</span>
                                </>
                              ) : subscription?.connectionStatus === 'connecting' ? (
                                <>
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                                  <span className="text-sm text-yellow-600">Connecting</span>
                                </>
                              ) : (
                                <>
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                                  <span className="text-sm text-blue-600">Subscribing</span>
                                </>
                              )}
                            </div>
                            
                            {/* Message Count */}
                            {messageCount > 0 && (
                              <div className="flex items-center">
                                <span className="text-sm text-gray-600">
                                  {messageCount} message{messageCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {messageCount > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportMessages(subject)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Export
                        </Button>
                      )}
                      {isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => stopSubscription(subject)}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <Square className="w-4 h-4 mr-1" />
                          Stop
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => startSubscription(subject)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Subscribe
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Scroll indicator */}
            {subjects.length > 10 && (
              <div className="absolute bottom-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded">
                Showing {subjectsVirtualizer.getVirtualItems().length} of {subjects.length}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Right Side - Live Messages */}
    <div className="w-full lg:w-1/2 flex flex-col min-h-[400px] lg:min-h-0">
      {/* Active Subscriptions Status - Show when subscriptions are active but no data messages yet */}
      {(() => {
        const activeSubscriptions = Object.entries(subscriptions).filter(([_, sub]) => sub.isActive);
        const hasDataMessages = Object.values(subscriptions).some(sub => sub.messages.length > 0);
        
        if (activeSubscriptions.length === 0 || hasDataMessages) return null;
        
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mt-2"></div>
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 mb-2">
                  Waiting for Data Messages
                </h3>
                <p className="text-blue-700 text-sm mb-3">
                  You have {activeSubscriptions.length} active subscription{activeSubscriptions.length > 1 ? 's' : ''}, 
                  but no data messages have been received yet. Only messages with data content will appear here.
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-blue-600 font-medium">Active subscriptions:</p>
                  <div className="flex flex-wrap gap-2">
                    {activeSubscriptions.map(([subject]) => (
                      <span key={subject} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Live Messages Panel - Tabbed Interface */}
      <div className="bg-white rounded-lg border border-gray-200 flex-1 flex flex-col overflow-y-auto">
        <div className="px-4 py-3 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            {(() => {
              const hasMessages = Object.values(subscriptions).some(sub => sub.messages.length > 0);
              const totalMessages = Object.values(subscriptions).reduce((sum, sub) => sum + sub.messages.length, 0);
              
              return (
                <>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Live Messages {hasMessages ? `(${totalMessages})` : ''}
                  </h2>
                </>
              );
            })()}
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {Object.values(subscriptions).some(sub => sub.messages.length > 0) ? (
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab} 
              defaultValue=""
              className="h-full flex flex-col"
            >
              <div className="px-4 py-2 border-b bg-gray-50">
                <TabsList className="h-auto p-1 bg-gray-100">
                  {Object.entries(subscriptions)
                    .filter(([_, sub]) => sub.isActive && sub.messages.length > 0)
                    .map(([subject, subscription]) => (
                      <TabsTrigger 
                        key={subject} 
                        value={subject}
                        className="flex items-center gap-2 px-3 py-2"
                      >
                        <span className="truncate max-w-32">{subject}</span>
                        <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px]">
                          {subscription.messages.length}
                        </span>
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      </TabsTrigger>
                    ))}
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden">
                {Object.entries(subscriptions)
                  .filter(([_, sub]) => sub.isActive && sub.messages.length > 0)
                  .map(([subject]) => (
                    <TabsContent 
                      key={subject} 
                      value={subject} 
                      className="h-full mt-0 p-0 relative"
                    >
                      <div 
                        ref={subject === activeTab ? messagesContainerRef : null}
                        className="h-full overflow-y-auto"
                        onScroll={handleScroll}
                      >
                        <div className="space-y-1 p-2">
                          {subject === activeTab && activeMessages.map((message, index) => {
                            const dataStr = typeof message.data === 'string' ? message.data : JSON.stringify(message.data);
                            const isLongData = dataStr?.length > 100;
                            const previewData = isLongData ? `${dataStr.substring(0, 100)}...` : dataStr;
                            
                            return (
                              <div
                                key={`message-${activeTab}-${index}-${message.timestamp}`}
                                onClick={() => openMessageModal(message)}
                                className="px-4 py-2 hover:bg-blue-50 transition-all duration-200 cursor-pointer border-l-4 border-transparent hover:border-blue-400 hover:shadow-sm group border-b border-gray-100 last:border-b-0"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded flex-shrink-0">
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                  </span>
                                  
                                  <div className="flex-1 bg-gray-900 text-gray-100 p-2 rounded text-xs font-mono overflow-hidden">
                                    <div className="break-words whitespace-pre-wrap">
                                      {previewData}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {message.headers && Object.keys(message.headers).length > 0 && (
                                      <span className="text-xs text-orange-600 bg-orange-100 px-1 py-0.5 rounded">
                                        {Object.keys(message.headers).length} headers
                                      </span>
                                    )}
                                    {isLongData && (
                                      <span className="text-xs text-blue-600 bg-blue-100 px-1 py-0.5 rounded group-hover:bg-blue-200 transition-colors">
                                        Click to expand
                                      </span>
                                    )}
                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Scroll indicator for messages */}
                        {activeMessages.length > 50 && (
                          <div className="sticky bottom-2 right-2 ml-auto w-fit bg-gray-800 text-white text-xs px-2 py-1 rounded mb-2 mr-2">
                            Showing {activeMessages.length} messages
                          </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>
                      {/* Jump to Latest Button - Show for active tab */}
                      {activeTab === subject && (
                        <div>
                          {showJumpToLatest && (
                            <button
                              onClick={scrollToBottom}
                              className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-xl transition-all duration-200 flex items-center gap-2 text-sm font-medium z-50 border-2 border-white"
                            >
                              <ChevronDown className="w-4 h-4" />
                              Jump to Latest
                            </button>
                          )}
                        </div>
                      )}
                    </TabsContent>
                  ))}
              </div>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-6">
              <div className="text-center">
                {Object.entries(subscriptions).filter(([_, sub]) => sub.isActive).length === 0 ? (
                  <>
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-4.126-.98L3 20l1.98-5.874A8.955 8.955 0 73 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Subscriptions</h3>
                    <p className="text-sm text-gray-500 max-w-md">
                      Start subscribing to subjects to see live messages appear here. 
                      Each subject will appear as a separate tab when messages arrive.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                    <h3 className="text-lg font-medium text-blue-900 mb-2">Waiting for Messages</h3>
                    <p className="text-sm text-blue-600 max-w-md mb-4">
                      You have active subscriptions. Messages will appear as tabs when they arrive.
                    </p>
                    <div className="flex flex-wrap gap-1 justify-center max-w-md">
                      {Object.entries(subscriptions).filter(([_, sub]) => sub.isActive).map(([subject]) => (
                        <span key={subject} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {subject}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
  </div>

      {/* Message Detail Modal */}
      {isModalOpen && selectedMessage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeMessageModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Message Details</h2>
                <button
                  onClick={closeMessageModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              {/* Message Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Subject</h3>
                  <p className="text-sm font-mono bg-white p-2 rounded border">
                    {selectedMessage.subject}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Timestamp</h3>
                  <p className="text-sm font-mono bg-white p-2 rounded border">
                    {new Date(selectedMessage.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Message Data */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Data</h3>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {typeof selectedMessage.data === 'string' 
                      ? selectedMessage.data 
                      : JSON.stringify(selectedMessage.data, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Headers */}
              {selectedMessage.headers && Object.keys(selectedMessage.headers).length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Headers</h3>
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                    <pre className="text-sm font-mono whitespace-pre-wrap">
                      {JSON.stringify(selectedMessage.headers, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Raw JSON */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Raw JSON</h3>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {JSON.stringify(selectedMessage, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedMessage, null, 2));
                }}
              >
                Copy JSON
              </Button>
              <Button
                onClick={closeMessageModal}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}