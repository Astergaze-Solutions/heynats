import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { publishApi, type PublishRequest, type PublishMessage, type RequestReplyRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';

interface Header {
  key: string;
  value: string;
}

export function PublishPage() {
  // Single message state
  const [subject, setSubject] = useState('');
  const [data, setData] = useState('');
  const [headers, setHeaders] = useState<Header[]>([{ key: '', value: '' }]);

  // Batch message state
  const [batchMessages, setBatchMessages] = useState<PublishMessage[]>([
    { subject: '', data: '', headers: {} }
  ]);

  // Request-reply state
  const [requestSubject, setRequestSubject] = useState('');
  const [requestData, setRequestData] = useState('');
  const [requestHeaders, setRequestHeaders] = useState<Header[]>([{ key: '', value: '' }]);
  const [timeout, setTimeout] = useState(30); // Default 30 seconds
  const [replySubject, setReplySubject] = useState('');

  // Get subject suggestions
  const { data: subjectsData } = useQuery({
    queryKey: ['publish-subjects'],
    queryFn: publishApi.getSubjects,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Single message publish mutation
  const publishMutation = useMutation({
    mutationFn: publishApi.publishMessage,
    onSuccess: () => {
      // Reset form on success
      setSubject('');
      setData('');
      setHeaders([{ key: '', value: '' }]);
    },
  });

  // Batch publish mutation
  const batchPublishMutation = useMutation({
    mutationFn: publishApi.publishBatch,
    onSuccess: () => {
      // Reset form on success
      setBatchMessages([{ subject: '', data: '', headers: {} }]);
    },
  });

  // Request-reply mutation
  const requestReplyMutation = useMutation({
    mutationFn: publishApi.requestReply,
  });

  const handlePublishMessage = () => {
    const headersObject = headers.reduce((acc, header) => {
      if (header.key && header.value) {
        acc[header.key] = header.value;
      }
      return acc;
    }, {} as Record<string, string>);

    const request: PublishRequest = {
      subject,
      data,
      ...(Object.keys(headersObject).length > 0 && { headers: headersObject }),
    };

    publishMutation.mutate(request);
  };

  const handleBatchPublish = () => {
    const validMessages = batchMessages.filter(msg => msg.subject && msg.data);
    if (validMessages.length === 0) return;

    batchPublishMutation.mutate({ messages: validMessages });
  };

  const handleRequestReply = () => {
    const headersObject = requestHeaders.reduce((acc, header) => {
      if (header.key && header.value) {
        acc[header.key] = header.value;
      }
      return acc;
    }, {} as Record<string, string>);

    const request: RequestReplyRequest = {
      subject: requestSubject,
      data: requestData,
      timeout,
      ...(Object.keys(headersObject).length > 0 && { headers: headersObject }),
      ...(replySubject && { reply_subject: replySubject }),
    };

    requestReplyMutation.mutate(request);
  };

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = headers.map((header, i) =>
      i === index ? { ...header, [field]: value } : header
    );
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const addBatchMessage = () => {
    setBatchMessages([...batchMessages, { subject: '', data: '', headers: {} }]);
  };

  const updateBatchMessage = (index: number, field: keyof PublishMessage, value: any) => {
    const newMessages = batchMessages.map((msg, i) =>
      i === index ? { ...msg, [field]: value } : msg
    );
    setBatchMessages(newMessages);
  };

  const removeBatchMessage = (index: number) => {
    setBatchMessages(batchMessages.filter((_, i) => i !== index));
  };

  const addRequestHeader = () => {
    setRequestHeaders([...requestHeaders, { key: '', value: '' }]);
  };

  const updateRequestHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = requestHeaders.map((header, i) =>
      i === index ? { ...header, [field]: value } : header
    );
    setRequestHeaders(newHeaders);
  };

  const removeRequestHeader = (index: number) => {
    setRequestHeaders(requestHeaders.filter((_, i) => i !== index));
  };

  return (
    <div className="p-3">
      <div className="max-w-full">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Publish Messages</h2>
          <p className="text-sm text-gray-600">Send messages to NATS subjects</p>
        </div>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="single">Single Message</TabsTrigger>
            <TabsTrigger value="batch">Batch Messages</TabsTrigger>
            <TabsTrigger value="request-reply">Request-Reply</TabsTrigger>
          </TabsList>

          {/* Single Message Tab */}
          <TabsContent value="single" className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Publish Single Message</h3>
              
              <div className="space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <AutocompleteInput
                    value={subject}
                    onChange={setSubject}
                    suggestions={subjectsData?.subjects || []}
                    placeholder="e.g., events.user.created"
                  />
                </div>

                {/* Message Data */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Data *
                  </label>
                  <Textarea
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    placeholder='{"message": "Hello, World!", "timestamp": "2024-01-01T00:00:00Z"}'
                    className="min-h-[120px]"
                  />
                </div>

                {/* Headers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Headers (Optional)
                  </label>
                  <div className="space-y-2">
                    {headers.map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="text"
                          value={header.key}
                          onChange={(e) => updateHeader(index, 'key', e.target.value)}
                          placeholder="Header key"
                          className="flex-1"
                        />
                        <Input
                          type="text"
                          value={header.value}
                          onChange={(e) => updateHeader(index, 'value', e.target.value)}
                          placeholder="Header value"
                          className="flex-1"
                        />
                        {headers.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeHeader(index)}
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addHeader}
                    className="mt-2"
                  >
                    Add Header
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={handlePublishMessage}
                    disabled={!subject || !data || publishMutation.isPending}
                  >
                    {publishMutation.isPending ? 'Publishing...' : 'Publish Message'}
                  </Button>
                </div>

                {/* Results */}
                {publishMutation.data && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">
                      Message published successfully to subject: {publishMutation.data.subject}
                    </p>
                  </div>
                )}

                {publishMutation.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">
                      Error: {publishMutation.error.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Batch Messages Tab */}
          <TabsContent value="batch" className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Publish Batch Messages</h3>
              
              <div className="space-y-4">
                {batchMessages.map((message, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-gray-700">Message {index + 1}</h4>
                      {batchMessages.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeBatchMessage(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subject *
                        </label>
                        <AutocompleteInput
                          value={message.subject}
                          onChange={(value) => updateBatchMessage(index, 'subject', value)}
                          suggestions={subjectsData?.subjects || []}
                          placeholder="e.g., events.user.created"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Message Data *
                        </label>
                        <Textarea
                          value={message.data}
                          onChange={(e) => updateBatchMessage(index, 'data', e.target.value)}
                          placeholder="Message content"
                          className="min-h-[60px]"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addBatchMessage}
                  >
                    Add Message
                  </Button>
                  <Button
                    onClick={handleBatchPublish}
                    disabled={batchMessages.every(m => !m.subject || !m.data) || batchPublishMutation.isPending}
                  >
                    {batchPublishMutation.isPending ? 'Publishing...' : 'Publish Batch'}
                  </Button>
                </div>

                {/* Results */}
                {batchPublishMutation.data && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800 mb-2">
                      Batch publish completed: {batchPublishMutation.data.succeeded}/{batchPublishMutation.data.total} successful
                    </p>
                    {batchPublishMutation.data.results.map((result, index) => (
                      <div key={index} className="text-xs text-green-700">
                        {result.subject}: {result.success ? 'Success' : `Failed - ${result.error}`}
                      </div>
                    ))}
                  </div>
                )}

                {batchPublishMutation.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">
                      Error: {batchPublishMutation.error.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Request-Reply Tab */}
          <TabsContent value="request-reply" className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Request-Reply Pattern</h3>
              
              <div className="space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <AutocompleteInput
                    value={requestSubject}
                    onChange={setRequestSubject}
                    suggestions={subjectsData?.subjects || []}
                    placeholder="e.g., api.user.get"
                  />
                </div>

                {/* Request Data */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Request Data *
                  </label>
                  <Textarea
                    value={requestData}
                    onChange={(e) => setRequestData(e.target.value)}
                    placeholder='{"user_id": "12345"}'
                    className="min-h-[120px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Timeout */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timeout (seconds)
                    </label>
                    <Input
                      type="number"
                      value={timeout}
                      onChange={(e) => setTimeout(parseInt(e.target.value) || 5)}
                      min="1"
                      max="60"
                    />
                  </div>

                  {/* Reply Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reply Subject (Optional)
                    </label>
                    <Input
                      type="text"
                      value={replySubject}
                      onChange={(e) => setReplySubject(e.target.value)}
                      placeholder="Custom reply subject"
                    />
                  </div>
                </div>

                {/* Headers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Headers (Optional)
                  </label>
                  <div className="space-y-2">
                    {requestHeaders.map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="text"
                          value={header.key}
                          onChange={(e) => updateRequestHeader(index, 'key', e.target.value)}
                          placeholder="Header key"
                          className="flex-1"
                        />
                        <Input
                          type="text"
                          value={header.value}
                          onChange={(e) => updateRequestHeader(index, 'value', e.target.value)}
                          placeholder="Header value"
                          className="flex-1"
                        />
                        {requestHeaders.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeRequestHeader(index)}
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRequestHeader}
                    className="mt-2"
                  >
                    Add Header
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleRequestReply}
                    disabled={!requestSubject || !requestData || requestReplyMutation.isPending}
                  >
                    {requestReplyMutation.isPending ? 'Sending...' : 'Send Request'}
                  </Button>
                </div>

                {/* Results */}
                {requestReplyMutation.data && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <h4 className="text-sm font-medium text-green-800 mb-2">Response Received:</h4>
                    <div className="text-xs space-y-1">
                      <div><strong>Reply Subject:</strong> {requestReplyMutation.data.reply_subject}</div>
                      <div><strong>Reply Data:</strong></div>
                      <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
                        {requestReplyMutation.data.reply_data}
                      </pre>
                    </div>
                  </div>
                )}

                {requestReplyMutation.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">
                      Error: {requestReplyMutation.error.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}