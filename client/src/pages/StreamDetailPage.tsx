import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { streamsApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { StatsCard } from '../components/StatsCard';
import { ArrowLeft, Play, Square, Download, BarChart3, HardDrive, Users, Hash } from 'lucide-react';

interface SubjectSubscription {
  subject: string;
  isActive: boolean;
  messages: any[];
  eventSource: EventSource | null;
}

interface MessageEvent {
  subject: string;
  data: any;
  timestamp: string;
  headers?: Record<string, string>;
}

export function StreamDetailPage() {
  const { streamName } = useParams<{ streamName: string }>();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<Record<string, SubjectSubscription>>({});
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        setSubscriptions(prev => ({
          ...prev,
          [subject]: {
            ...prev[subject],
            messages: [...(prev[subject]?.messages || []), messageData],
          },
        }));
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
    <div className="p-6 max-w-7xl mx-auto">
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
        <h2 className="text-xl font-semibold mb-4">Subjects ({subjects.length})</h2>
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
                        <div className="flex items-center mt-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          <span className="text-sm text-green-600">
                            Subscribing • {messageCount} messages
                          </span>
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

      {/* Messages Panel */}
      {Object.keys(subscriptions).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Live Messages</h2>
          </div>
          <div className="h-96 overflow-y-auto p-4">
            {Object.entries(subscriptions).map(([subject, subscription]) => {
              if (subscription.messages.length === 0) return null;
              
              return (
                <div key={subject} className="mb-6">
                  <h3 className="font-semibold text-lg mb-3 text-blue-600">
                    {subject} ({subscription.messages.length} messages)
                  </h3>
                  <div className="space-y-2">
                    {subscription.messages.map((message, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleString()}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {message.subject}
                          </span>
                        </div>
                        <pre className="text-sm bg-white p-2 rounded border overflow-x-auto">
                          {typeof message.data === 'string' 
                            ? message.data 
                            : JSON.stringify(message.data, null, 2)}
                        </pre>
                        {message.headers && Object.keys(message.headers).length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <span className="text-xs text-gray-600">Headers:</span>
                            <pre className="text-xs bg-gray-100 p-1 rounded mt-1">
                              {JSON.stringify(message.headers, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
            {Object.values(subscriptions).every(sub => sub.messages.length === 0) && (
              <div className="text-center text-gray-500 py-8">
                No messages received yet. Start subscribing to see live data.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}