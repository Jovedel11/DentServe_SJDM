import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  MailOpen, 
  User, 
  Clock, 
  Search,
  X,
  Star,
  StarOff,
  Phone,
  Reply,
  Archive,
  Trash2,
  Paperclip,
  ChevronLeft,
  MoreHorizontal,
  Send
} from 'lucide-react';
import { IconMail, IconRefresh } from '@tabler/icons-react';

const GmailInboxModal = ({ onClose, showInboxModal }) => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showEmailDetail, setShowEmailDetail] = useState(false);

  // Mock data based on your patient_emails table structure
  useEffect(() => {
    setTimeout(() => {
      setEmails([
        {
          id: 'email-001',
          gmail_message_id: 'msg_001',
          patient_id: 'patient-001',
          patient_name: 'Maria Santos',
          patient_email: 'maria.santos@gmail.com',
          subject: 'Question about my upcoming appointment',
          preview: 'Hi, I wanted to ask about the preparation needed for my root canal procedure...',
          body: `Hi,

I wanted to ask about the preparation needed for my root canal procedure scheduled for tomorrow at 2:00 PM.

Should I take any medication beforehand? Also, will I be able to drive home after the procedure?

Thank you for your time.

Best regards,
Maria Santos
Phone: +63-917-234-5678`,
          received_at: '2025-08-21T12:30:00Z',
          is_read: false,
          is_starred: true,
          has_attachment: false,
          appointment_date: '2025-08-22',
          appointment_time: '14:00:00',
          priority: 'high' // urgent appointment question
        },
        {
          id: 'email-002',
          gmail_message_id: 'msg_002',
          patient_id: 'patient-002',
          patient_name: 'Ana Lopez',
          patient_email: 'ana.lopez@hotmail.com',
          subject: 'URGENT: Request to reschedule appointment',
          preview: 'Good morning, I need to reschedule my appointment due to a family emergency...',
          body: `Good morning,

I need to reschedule my appointment scheduled for August 23rd at 9:00 AM due to a family emergency.

Could you please let me know your available slots for next week? I'm flexible with the timing.

I apologize for the short notice and any inconvenience this may cause.

Thank you for understanding.

Ana Lopez
Phone: +63-919-456-7890`,
          received_at: '2025-08-21T08:45:00Z',
          is_read: false,
          is_starred: false,
          has_attachment: false,
          appointment_date: '2025-08-23',
          appointment_time: '09:00:00',
          priority: 'high' // urgent reschedule
        },
        {
          id: 'email-003',
          gmail_message_id: 'msg_003',
          patient_id: 'patient-003',
          patient_name: 'Sofia Reyes',
          patient_email: 'sofia.reyes@gmail.com',
          subject: 'Post-treatment care questions',
          preview: 'Hi, I had my wisdom tooth extraction yesterday and I have some questions...',
          body: `Hi,

I had my wisdom tooth extraction yesterday and I have some questions about the aftercare instructions.

1. Is it normal to have slight bleeding after 24 hours?
2. When can I resume normal eating?
3. Should I be concerned about the swelling on my left cheek?

I'm following all the instructions given, but wanted to double-check these concerns.

Thank you for your guidance.

Sofia Reyes
Phone: +63-921-678-9012`,
          received_at: '2025-08-20T14:10:00Z',
          is_read: false,
          is_starred: false,
          has_attachment: false,
          appointment_date: '2025-08-19',
          appointment_time: '15:30:00',
          priority: 'medium' // post-care questions
        },
        {
          id: 'email-004',
          gmail_message_id: 'msg_004',
          patient_id: 'patient-004',
          patient_name: 'John Rivera',
          patient_email: 'john.rivera@yahoo.com',
          subject: 'Thank you for the excellent service',
          preview: 'I just wanted to express my gratitude for the wonderful dental care...',
          body: `Dear Staff,

I just wanted to express my gratitude for the wonderful dental care I received yesterday during my teeth cleaning appointment.

Dr. Smith and the entire team were very professional and made me feel comfortable throughout the procedure.

I would definitely recommend your clinic to my friends and family.

Thank you once again!

John Rivera
Phone: +63-918-345-6789`,
          received_at: '2025-08-21T10:15:00Z',
          is_read: true,
          is_starred: false,
          has_attachment: false,
          appointment_date: '2025-08-20',
          appointment_time: '10:00:00',
          priority: 'low' // thank you message
        },
        {
          id: 'email-005',
          gmail_message_id: 'msg_005',
          patient_id: 'patient-005',
          patient_name: 'Carlos Mendoza',
          patient_email: 'carlos.mendoza@gmail.com',
          subject: 'Insurance coverage inquiry',
          preview: 'Hello, I would like to confirm if my insurance plan covers the orthodontic treatment...',
          body: `Hello,

I would like to confirm if my insurance plan covers the orthodontic treatment we discussed during my consultation.

My insurance provider is PhilHealth and I also have private insurance through my company.

Could you please check and let me know what portion would be covered?

I've attached my insurance cards for your reference.

Best regards,
Carlos Mendoza
Phone: +63-920-567-8901`,
          received_at: '2025-08-20T16:20:00Z',
          is_read: false,
          is_starred: true,
          has_attachment: true,
          appointment_date: null,
          appointment_time: null,
          priority: 'medium' // insurance inquiry
        }
      ]);
      setLoading(false);
    }, 800);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    // TODO: Call Gmail sync function here
    setTimeout(() => setRefreshing(false), 1000);
  };

  const markAsRead = (emailId) => {
    setEmails(emails.map(email => 
      email.id === emailId ? { ...email, is_read: true } : email
    ));
  };

  const toggleStar = (emailId) => {
    setEmails(emails.map(email => 
      email.id === emailId ? { ...email, is_starred: !email.is_starred } : email
    ));
  };

  const handleEmailClick = (email) => {
    setSelectedEmail(email);
    setShowEmailDetail(true);
    if (!email.is_read) markAsRead(email.id);
  };

  const handleBackToList = () => {
    setShowEmailDetail(false);
    setSelectedEmail(null);
  };

  const filteredEmails = emails.filter(email => 
    email.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = emails.filter(email => !email.is_read).length;
  const priorityEmails = filteredEmails.filter(email => email.priority === 'high' && !email.is_read);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      });
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50/30 dark:bg-red-900/10';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50/30 dark:bg-yellow-900/10';
      default: return 'border-l-green-500 bg-green-50/30 dark:bg-green-900/10';
    }
  };

  // Prevent modal from closing when clicking inside
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* Gmail Inbox Modal */}
      {showInboxModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div 
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col animate-fadeIn"
            onClick={handleModalClick}
          >
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                    <IconMail className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                  <p className="text-muted-foreground font-medium">Loading patient messages...</p>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="border-b border-border p-4 md:p-6 bg-muted/30 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {showEmailDetail && (
                        <button
                          onClick={handleBackToList}
                          className="p-2 hover:bg-muted rounded-lg transition-colors lg:hidden"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <IconMail className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-xl md:text-2xl font-bold text-foreground">
                            {showEmailDetail ? 'Email Details' : 'Patient Inbox'}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {showEmailDetail 
                              ? `From: ${selectedEmail?.patient_name}`
                              : `${filteredEmails.length} messages • ${unreadCount} unread`
                            }
                          </p>
                        </div>
                      </div>
                      
                      {!showEmailDetail && unreadCount > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="bg-red-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                            {unreadCount} new
                          </span>
                          {priorityEmails.length > 0 && (
                            <span className="bg-yellow-500 text-yellow-900 text-xs font-medium px-3 py-1 rounded-full">
                              {priorityEmails.length} urgent
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!showEmailDetail && (
                        <button
                          onClick={handleRefresh}
                          disabled={refreshing}
                          className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          <IconRefresh className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">Refresh</span>
                        </button>
                      )}
                      <button
                        onClick={onClose}
                        className="p-2 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-lg transition-colors"
                        title="Close Inbox"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 flex min-h-0 overflow-hidden">
                  {/* Email List Panel */}
                  <div className={`${showEmailDetail ? 'hidden lg:block lg:w-2/5' : 'w-full'} border-r border-border flex flex-col bg-muted/10`}>
                    {/* Search Bar */}
                    <div className="p-4 border-b border-border">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search patient messages..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                    
                    {/* Email List */}
                    <div className="flex-1 overflow-y-auto">
                      {filteredEmails.length > 0 ? (
                        <div>
                          {filteredEmails.map((email) => (
                            <div
                              key={email.id}
                              onClick={() => handleEmailClick(email)}
                              className={`
                                p-4 hover:bg-muted/50 cursor-pointer transition-all duration-200 border-l-4
                                ${!email.is_read ? getPriorityColor(email.priority) : 'border-l-transparent'}
                                ${selectedEmail?.id === email.id ? 'bg-primary/10' : ''}
                              `}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-1">
                                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center ring-2 ring-primary/20">
                                    <User className="w-5 h-5 text-primary" />
                                  </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-semibold text-sm truncate ${
                                        !email.is_read ? 'text-foreground' : 'text-muted-foreground'
                                      }`}>
                                        {email.patient_name}
                                      </span>
                                      {!email.is_read && (
                                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></div>
                                      )}
                                      {email.priority === 'high' && !email.is_read && (
                                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                          URGENT
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-1 ml-2">
                                      {email.is_starred && (
                                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                      )}
                                      <span className="text-xs text-muted-foreground font-medium">
                                        {formatTime(email.received_at)}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <p className={`text-sm truncate ${
                                      !email.is_read ? 'font-semibold text-foreground' : 'text-muted-foreground'
                                    }`}>
                                      {email.subject}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                      {email.preview}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 mt-3">
                                    {email.has_attachment && (
                                      <div className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
                                        <Paperclip className="w-3 h-3" />
                                        <span>Attachment</span>
                                      </div>
                                    )}
                                    {email.appointment_date && (
                                      <div className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                        <Clock className="w-3 h-3" />
                                        <span>
                                          {new Date(email.appointment_date).toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric' 
                                          })} • {email.appointment_time?.slice(0, 5)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                          <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                            <Mail className="w-10 h-10 text-muted-foreground/50" />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {searchQuery ? 'No matching emails' : 'No messages yet'}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            {searchQuery 
                              ? 'Try adjusting your search criteria'
                              : 'Patient emails will appear here when received'
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email Detail Panel */}
                  {showEmailDetail && selectedEmail ? (
                    <div className={`${showEmailDetail ? 'w-full lg:w-3/5' : 'hidden'} flex flex-col bg-background`}>
                      {/* Email Header */}
                      <div className="border-b border-border p-4 md:p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center ring-2 ring-primary/20">
                              <User className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-foreground">
                                {selectedEmail.patient_name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {selectedEmail.patient_email}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Received: {new Date(selectedEmail.received_at).toLocaleString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleStar(selectedEmail.id)}
                              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                              title={selectedEmail.is_starred ? 'Remove star' : 'Add star'}
                            >
                              {selectedEmail.is_starred ? (
                                <Star className="w-5 h-5 text-yellow-500 fill-current" />
                              ) : (
                                <StarOff className="w-5 h-5 text-muted-foreground" />
                              )}
                            </button>
                            <button 
                              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                              title="Archive"
                            >
                              <Archive className="w-5 h-5 text-muted-foreground" />
                            </button>
                            <button 
                              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5 text-muted-foreground" />
                            </button>
                            <button 
                              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                              title="More options"
                            >
                              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                            </button>
                          </div>
                        </div>

                        <h4 className="text-xl font-bold text-foreground mb-4">
                          {selectedEmail.subject}
                        </h4>
                        
                        {selectedEmail.appointment_date && (
                          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <Clock className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
                                Related Appointment
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-500">
                                {new Date(selectedEmail.appointment_date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric'
                                })} at {selectedEmail.appointment_time?.slice(0, 5)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Email Body */}
                      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed bg-muted/20 p-4 rounded-lg">
                            {selectedEmail.body}
                          </div>
                        </div>
                        
                        {selectedEmail.has_attachment && (
                          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <Paperclip className="w-5 h-5 text-amber-600" />
                              <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">Attachments</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                                <span className="text-xs font-bold text-red-600">PDF</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-foreground">insurance_cards.pdf</p>
                                <p className="text-xs text-muted-foreground">245 KB • Uploaded 2 hours ago</p>
                              </div>
                              <button className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
                                Download
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="border-t border-border p-4 md:p-6 bg-muted/30">
                        <div className="flex flex-wrap gap-3">
                          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                            <Reply className="w-4 h-4" />
                            Reply to Patient
                          </button>
                          <button className="flex items-center gap-2 px-4 py-2.5 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium">
                            <Phone className="w-4 h-4" />
                            Call Patient
                          </button>
                          <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors text-sm">
                            <Send className="w-4 h-4" />
                            Forward
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Empty State for Desktop */
                    <div className="hidden lg:flex lg:w-3/5 items-center justify-center bg-background">
                      <div className="text-center">
                        <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
                          <MailOpen className="w-12 h-12 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-3">
                          Select an email to read
                        </h3>
                        <p className="text-muted-foreground text-sm max-w-sm">
                          Choose a patient message from the list to view its full content and respond
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default GmailInboxModal;