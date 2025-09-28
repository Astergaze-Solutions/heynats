import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConnectionStatus } from '../hooks/useNATS';
import { 
  useKVBucket, 
  useKVBucketKeys, 
  useSetKVKey, 
  useDeleteKVKey, 
  useDeleteKVBucket 
} from '../hooks/useKV';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { StatsCard } from '../components/StatsCard';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Key, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff,
  Copy,
  Clock,
  Archive,
  HardDrive,
  Hash 
} from 'lucide-react';



export function KVBucketDetailPage() {
  const { bucketName } = useParams<{ bucketName: string }>();
  const navigate = useNavigate();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('overview');
  const [isAddingKey, setIsAddingKey] = useState(false);
  
  // Ref for focusing on the key input when add form appears
  const keyInputRef = useRef<HTMLInputElement>(null);

  // Focus on key input when add form appears
  useEffect(() => {
    if (isAddingKey && activeTab === 'keys' && keyInputRef.current) {
      // Small delay to ensure the form is rendered
      const timer = setTimeout(() => {
        keyInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAddingKey, activeTab]);

  // Check connection status
  const { data: connectionStatus } = useConnectionStatus();
  const isConnected = connectionStatus?.connected || false;

  // Fetch bucket data
  const { 
    data: bucket, 
    isLoading: bucketLoading,
    error: bucketError 
  } = useKVBucket(bucketName!, isConnected && !!bucketName);

  const { 
    data: keysData, 
    isLoading: keysLoading,
    error: keysError 
  } = useKVBucketKeys(bucketName!, isConnected && !!bucketName);

  // Mutations
  const setKeyMutation = useSetKVKey();
  const deleteKeyMutation = useDeleteKVKey();
  const deleteBucketMutation = useDeleteKVBucket();

  const keys = keysData?.entries || [];
  
  // Filter keys based on search term
  const filteredKeys = keys.filter(entry =>
    entry.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTTL = (ttl: string): string => {
    if (ttl === '0s' || ttl === '0') return 'No TTL';
    return ttl;
  };



  const handleAddKey = () => {
    if (newKey.trim() && bucketName) {
      setKeyMutation.mutate({
        bucketName,
        key: newKey.trim(),
        value: newValue
      }, {
        onSuccess: () => {
          setNewKey('');
          setNewValue('');
          setIsAddingKey(false);
        }
      });
    }
  };

  const handleCancelAddKey = () => {
    setIsAddingKey(false);
    setNewKey('');
    setNewValue('');
  };

  const handleEditKey = (key: string, currentValue: string) => {
    setEditingKey(key);
    setEditValue(currentValue);
  };

  const handleSaveEdit = () => {
    if (editingKey && bucketName) {
      setKeyMutation.mutate({
        bucketName,
        key: editingKey,
        value: editValue
      }, {
        onSuccess: () => {
          setEditingKey(null);
          setEditValue('');
        }
      });
    }
  };

  const handleDeleteKey = (key: string) => {
    if (bucketName) {
      deleteKeyMutation.mutate({ bucketName, key });
    }
  };

  const handleDeleteBucket = () => {
    if (bucketName) {
      deleteBucketMutation.mutate(bucketName, {
        onSuccess: () => {
          navigate('/dashboard/kv');
        }
      });
    }
  };

  const toggleValueVisibility = (key: string) => {
    const newVisible = new Set(visibleValues);
    if (newVisible.has(key)) {
      newVisible.delete(key);
    } else {
      newVisible.add(key);
    }
    setVisibleValues(newVisible);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Redirect if not connected
  if (!isConnected) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <Button
            onClick={() => navigate('/dashboard/kv')}
            variant="outline"
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to KV Store
          </Button>
          
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="text-center">
              <Key className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Required</h3>
              <p className="text-gray-500 mb-6">
                Please connect to a NATS server to access Key-Value store features.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Go to Connection Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (bucketLoading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <Button
            onClick={() => navigate('/dashboard/kv')}
            variant="outline"
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to KV Store
          </Button>
          
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Bucket</h3>
              <p className="text-gray-500">Fetching bucket details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (bucketError) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <Button
            onClick={() => navigate('/dashboard/kv')}
            variant="outline"
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to KV Store
          </Button>
          
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="text-center">
              <svg className="mx-auto h-16 w-16 text-red-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Bucket</h3>
              <p className="text-gray-500 mb-6">
                Failed to load bucket details. The bucket may not exist.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => navigate('/dashboard/kv')}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to KV Store
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{bucketName}</h2>
              <p className="text-gray-600">Key-Value bucket management</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => {
                  setIsAddingKey(true);
                  setActiveTab('keys');
                }}
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Key
              </Button>
              <Button
                onClick={handleDeleteBucket}
                variant="outline"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Bucket
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="keys">Keys ({keys.length})</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {bucket && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                  title="Total Keys"
                  value={bucket.values?.toLocaleString() || 'N/A'}
                  icon={<Hash className="w-4 h-4 text-indigo-600" />}
                />
                <StatsCard
                  title="Storage Used"
                  value={formatBytes(bucket.bytes)}
                  icon={<HardDrive className="w-4 h-4 text-indigo-600" />}
                />
                <StatsCard
                  title="History"
                  value={`${bucket.history} revisions`}
                  icon={<Archive className="w-4 h-4 text-indigo-600" />}
                />
                <StatsCard
                  title="TTL"
                  value={formatTTL(bucket.ttl)}
                  icon={<Clock className="w-4 h-4 text-indigo-600" />}
                />
              </div>
            )}

            {/* Bucket Configuration */}
            {bucket && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Storage Type</dt>
                    <dd className="text-sm text-gray-900 capitalize">{bucket.backing_store}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Compression</dt>
                    <dd className="text-sm text-gray-900">{bucket.is_compressed ? 'Enabled' : 'Disabled'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">History per Key</dt>
                    <dd className="text-sm text-gray-900">{bucket.history} revisions</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Time to Live</dt>
                    <dd className="text-sm text-gray-900">{formatTTL(bucket.ttl)}</dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    setIsAddingKey(true);
                    setActiveTab('keys');
                  }}
                  className="flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Key
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('keys')}
                  className="flex items-center"
                >
                  <Key className="w-4 h-4 mr-2" />
                  View All Keys ({keys.length})
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Keys Tab */}
          <TabsContent value="keys" className="space-y-6">
            {/* Add Key Form */}
            {isAddingKey && (
              <div className="bg-white rounded-lg border-2 border-indigo-200 shadow-md p-6 transition-all duration-300 ease-in-out">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Plus className="w-5 h-5 mr-2 text-indigo-600" />
                  Add New Key
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
                    <Input
                      ref={keyInputRef}
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="Enter key name"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newKey.trim()) {
                          handleAddKey();
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                    <Input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="Enter value"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newKey.trim()) {
                          handleAddKey();
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                  <Button
                    variant="outline"
                    onClick={handleCancelAddKey}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddKey}
                    disabled={!newKey.trim() || setKeyMutation.isPending}
                  >
                    {setKeyMutation.isPending ? 'Adding...' : 'Add Key'}
                  </Button>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search keys..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Keys List */}
            {keysLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading keys...</p>
                </div>
              </div>
            ) : keysError ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="text-center">
                  <p className="text-red-600">Error loading keys</p>
                </div>
              </div>
            ) : filteredKeys.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="text-center">
                  <Key className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {keys.length === 0 ? 'No Keys Found' : 'No Keys Match Your Search'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {keys.length === 0 
                      ? 'Add your first key-value pair to get started.'
                      : 'Try adjusting your search term.'
                    }
                  </p>
                  {keys.length === 0 && (
                    <Button onClick={() => setIsAddingKey(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Key
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-500">
                    <div>Key</div>
                    <div>Value</div>
                    <div>Revision</div>
                    <div>Actions</div>
                  </div>
                </div>
                <div className="divide-y divide-gray-200">
                  {filteredKeys.map((entry) => (
                    <div key={entry.key} className="px-6 py-4">
                      <div className="grid grid-cols-4 gap-4 items-center">
                        <div className="flex items-center space-x-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {entry.key}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(entry.key)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <div>
                          {editingKey === entry.key ? (
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="text-sm"
                            />
                          ) : (
                            <div className="flex items-center space-x-2">
                              {visibleValues.has(entry.key) ? (
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded max-w-xs truncate">
                                  {entry.value}
                                </code>
                              ) : (
                                <span className="text-gray-400 text-sm">••••••••</span>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleValueVisibility(entry.key)}
                                className="h-6 w-6 p-0"
                              >
                                {visibleValues.has(entry.key) ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-500">
                          #{entry.revision}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {editingKey === entry.key ? (
                            <>
                              <Button
                                size="sm"
                                onClick={handleSaveEdit}
                                disabled={setKeyMutation.isPending}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingKey(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditKey(entry.key, entry.value)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteKey(entry.key)}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                disabled={deleteKeyMutation.isPending}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}