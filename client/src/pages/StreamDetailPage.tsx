import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { streamsApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { StatsCard } from '../components/StatsCard';
import { ArrowLeft, Play, Square, Download, BarChart3, HardDrive, Users, Hash, ChevronDown, ChevronUp, Filter, Eye, EyeOff } from 'lucide-react';

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
  
  // New state for improved UX
  const [collapsedSubjects, setCollapsedSubjects] = useState<Set<string>>(new Set());
  const [visibleSubjects, setVisibleSubjects] = useState<Set<string>>(new Set());
  const [showAllSubjects, setShowAllSubjects] = useState(true);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [subscriptions]);

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

  // Helper functions for subject visibility and collapsing
  const toggleSubjectCollapse = (subject: string) => {
    setCollapsedSubjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subject)) {
        newSet.delete(subject);
      } else {
        newSet.add(subject);
      }
      return newSet;
    });
  };

  const toggleSubjectVisibility = (subject: string) => {
    setVisibleSubjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subject)) {
        newSet.delete(subject);
      } else {
        newSet.add(subject);
      }
      return newSet;
    });
  };

  // Initialize visible subjects when subscriptions change
  useEffect(() => {
    const activeSubjects = Object.entries(subscriptions)
      .filter(([_, sub]) => sub.isActive && sub.messages.length > 0)
      .map(([subject]) => subject);
    
    if (activeSubjects.length > 0 && visibleSubjects.size === 0) {
      setVisibleSubjects(new Set([activeSubjects[0]])); // Show only the first one by default
    }
  }, [subscriptions, visibleSubjects.size]);

  // Auto-scroll to bottom when new messages arrive for visible subjects
  useEffect(() => {
    const visibleSubjectsArray = Array.from(visibleSubjects);
    const hasNewMessages = visibleSubjectsArray.some(subject => {
      const sub = subscriptions[subject];
      return sub && sub.messages.length > 0;
    });
    
    if (hasNewMessages && !showAllSubjects) {
      scrollToBottom();
    }
  }, [subscriptions, visibleSubjects, showAllSubjects]);

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

  const subjects = stream.config.subjects || [];
  const hasActiveSubscriptions = Object.values(subscriptions).some(sub => sub.isActive);

  return (
    <div className="p-6 max-w-full mx-auto">
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
            Stream: {stream.config.name}
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
          {/* Quick action for multiple subscriptions */}
          {hasActiveSubscriptions && Object.values(subscriptions).filter(sub => sub.isActive).length > 1 && (
            <Button
              onClick={() => {
                const activeSubjects = Object.entries(subscriptions)
                  .filter(([_, sub]) => sub.isActive && sub.messages.length > 0)
                  .map(([subject]) => subject);
                
                if (visibleSubjects.size === 0 && activeSubjects.length > 0) {
                  setVisibleSubjects(new Set([activeSubjects[0]]));
                  setShowAllSubjects(false);
                } else {
                  setShowAllSubjects(!showAllSubjects);
                  setVisibleSubjects(new Set());
                }
              }}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Filter className="w-3 h-3 mr-1" />
              Focus Mode
            </Button>
          )}
        </div>
      </div>

      {/* Stream Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Messages"
          value={stream.state.messages.toLocaleString()}
          icon={<BarChart3 className="w-4 h-4 text-blue-600" />}
        />
        <StatsCard
          title="Bytes"
          value={`${(stream.state.bytes / 1024 / 1024).toFixed(2)} MB`}
          icon={<HardDrive className="w-4 h-4 text-green-600" />}
        />
        <StatsCard
          title="Consumers"
          value={stream.state.consumer_count.toString()}
          icon={<Users className="w-4 h-4 text-purple-600" />}
        />
        <StatsCard
          title="Subjects"
          value={subjects.length.toString()}
          icon={<Hash className="w-4 h-4 text-orange-600" />}
        />
      </div>

      {/* Stream Configuration */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Stream Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Retention:</span> {stream.config.retention}
          </div>
          <div>
            <span className="font-medium">Storage:</span> {stream.config.storage}
          </div>
          <div>
            <span className="font-medium">Replicas:</span> {stream.config.num_replicas}
          </div>
          <div>
            <span className="font-medium">Max Messages:</span> {stream.config.max_msgs.toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Max Bytes:</span> {(stream.config.max_bytes / 1024 / 1024).toFixed(2)} MB
          </div>
          <div>
            <span className="font-medium">Max Age:</span> {stream.config.max_age ? `${stream.config.max_age}s` : 'No limit'}
          </div>
        </div>
      </div>

      {/* Subjects List */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Subjects ({subjects.length})</h2>
          {hasActiveSubscriptions && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600">
                {Object.values(subscriptions).filter(sub => sub.isActive).length} active subscriptions
              </span>
            </div>
          )}
        </div>
        {subjects.length === 0 ? (
          <p className="text-gray-500">No subjects configured for this stream</p>
        ) : (
          <div className="space-y-2">
            {subjects.map((subject) => {
              const subscription = subscriptions[subject];
              const isSelected = selectedSubjects.has(subject);
              const isActive = subscription?.isActive || false;
              const messageCount = subscription?.messages?.length || 0;

              return (
                <div
                  key={subject}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-green-50 border-green-200' 
                      : isSelected 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
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
                      <span className="font-medium text-gray-900">{subject}</span>
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
                  <div className="flex items-center gap-2">
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

      {/* Live Messages Panel - Always show, takes full height */}
      <div className="bg-white rounded-lg shadow-sm border flex-1 flex flex-col">
        <div className="px-4 py-3 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            {(() => {
              const hasMessages = Object.values(subscriptions).some(sub => sub.messages.length > 0);
              const totalMessages = Object.values(subscriptions).reduce((sum, sub) => sum + sub.messages.length, 0);
              
              return (
                <>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Live Messages {hasMessages ? `(${totalMessages})` : ''}
                  </h2>
                  {hasMessages && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-600 font-medium">Active</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          
          {/* Subject Filter Controls */}
          {(() => {
            const activeSubjectsWithMessages = Object.entries(subscriptions)
              .filter(([_, sub]) => sub.isActive && sub.messages.length > 0);
            
            if (activeSubjectsWithMessages.length === 0) return null;
            
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Active Subjects ({activeSubjectsWithMessages.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAllSubjects(!showAllSubjects)}
                      className="text-xs"
                    >
                      {showAllSubjects ? (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" />
                          Hide All
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Show All
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {activeSubjectsWithMessages.map(([subject, subscription]) => {
                    const isVisible = showAllSubjects || visibleSubjects.has(subject);
                    const messageCount = subscription.messages.length;
                    
                    return (
                      <button
                        key={subject}
                        onClick={() => toggleSubjectVisibility(subject)}
                        className={`text-xs px-2 py-1 rounded-full border transition-all duration-200 ${
                          isVisible
                            ? 'bg-blue-100 border-blue-300 text-blue-800 shadow-sm'
                            : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {subject} ({messageCount})
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {Object.values(subscriptions).some(sub => sub.messages.length > 0) ? (
            <div className="h-full">
              {Object.entries(subscriptions).map(([subject, subscription]) => {
                if (subscription.messages.length === 0) return null;
                
                // Check if this subject should be visible
                const shouldShow = showAllSubjects || visibleSubjects.has(subject);
                if (!shouldShow) return null;
                
                const isCollapsed = collapsedSubjects.has(subject);
                const recentMessages = subscription.messages.slice(-50); // Show more messages with virtualization
                const displayMessages = recentMessages.slice(-20); // Still limit for performance
                
                return (
                  <div key={subject} className="border-b border-gray-100 last:border-b-0">
                    {/* Subject Header - Always Visible and Clickable */}
                    <div 
                      className="sticky top-0 bg-blue-50 px-4 py-3 border-b border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => toggleSubjectCollapse(subject)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {isCollapsed ? (
                              <ChevronDown className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ChevronUp className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <h3 className="font-medium text-blue-900">
                            {subject}
                          </h3>
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                            {subscription.messages.length} messages
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSubjectVisibility(subject);
                            }}
                            className="p-1 hover:bg-blue-200 rounded transition-colors"
                            title="Hide this subject"
                          >
                            <EyeOff className="w-3 h-3 text-blue-600" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Summary when collapsed */}
                      {isCollapsed && (
                        <div className="mt-2 text-sm text-blue-700">
                          <div className="flex items-center gap-4">
                            <span>Latest: {subscription.messages.length > 0 && 
                              new Date(subscription.messages[subscription.messages.length - 1].timestamp).toLocaleTimeString()}</span>
                            <span>Click to expand messages</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Messages List - Collapsible */}
                    {!isCollapsed && (
                      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                        {displayMessages.map((message, index) => {
                          const dataStr = typeof message.data === 'string' ? message.data : JSON.stringify(message.data);
                          const isLongData = dataStr?.length > 100;
                          const previewData = isLongData ? `${dataStr.substring(0, 100)}...` : dataStr;
                          
                          return (
                            <div
                              key={`${subject}-${index}`}
                              onClick={() => openMessageModal(message)}
                              className="px-4 py-3 hover:bg-blue-50 transition-all duration-200 cursor-pointer border-l-4 border-transparent hover:border-blue-400 hover:shadow-sm group"
                            >
                              <div className="flex items-center justify-between gap-3 mb-1">
                                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  {new Date(message.timestamp).toLocaleTimeString()}
                                </span>
                                <div className="flex items-center gap-2">
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
                              
                              <div className="bg-gray-900 text-gray-100 p-2 rounded text-xs font-mono overflow-hidden">
                                <div className="truncate">
                                  {previewData}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {subscription.messages?.length > 20 && (
                          <div className="px-4 py-2 bg-blue-50 text-center">
                            <span className="text-xs text-blue-600">
                              Showing latest 20 of {subscription.messages.length} messages
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
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
                      When you have multiple active subjects, use the subject controls above to manage which ones are visible.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                    <h3 className="text-lg font-medium text-blue-900 mb-2">Waiting for Messages</h3>
                    <p className="text-sm text-blue-600 max-w-md mb-4">
                      You have active subscriptions. Messages will appear here when they arrive.
                      {Object.entries(subscriptions).filter(([_, sub]) => sub.isActive).length > 1 && (
                        <span className="block mt-2 text-xs">
                          💡 Tip: With multiple subscriptions, use the subject filters above to focus on specific subjects
                        </span>
                      )}
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
  );
}