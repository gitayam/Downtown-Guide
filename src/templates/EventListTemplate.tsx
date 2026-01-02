import React from 'react';

export interface Event {
  id: string;
  title: string;
  start_datetime: string;
  location_name: string | null;
  venue_name?: string;
  venue_address?: string;
  categories?: string | null;
  image_url?: string | null;
  venue_image_url?: string | null;
}

interface Props {
  events: Event[];
  title: string;
  subtitle: string;
}

export const EventListTemplate = ({ events, title, subtitle }: Props) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '800px',
        height: '100%',
        backgroundColor: 'white',
        fontFamily: 'Inter',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '40px',
          backgroundColor: '#A65D57', // Brick color
          color: 'white',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '48px', fontWeight: 800, marginBottom: '8px' }}>{title}</div>
          <div style={{ fontSize: '24px', opacity: 0.9 }}>{subtitle}</div>
        </div>
        
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '1px',
          }}
        >
          NCFAYETTEVILLE.COM
        </div>
      </div>

      {/* Events List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '40px',
          gap: '24px',
          backgroundColor: 'white',
          flexGrow: 1,
        }}
      >
        {events.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px', color: '#666', fontSize: '24px' }}>
            No events scheduled.
          </div>
        ) : (
          events.map((event, index) => {
            const startDate = new Date(event.start_datetime);
            const dateStr = startDate.getDate().toString();
            const monthStr = startDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
            const timeStr = startDate.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' });
            
            // Parse categories
            let cats: string[] = [];
            try {
              if (event.categories) {
                cats = JSON.parse(event.categories).slice(0, 2);
              }
            } catch (e) {}

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  borderBottom: index === events.length - 1 ? 'none' : '1px solid #f0f0f0',
                  paddingBottom: index === events.length - 1 ? 0 : '24px',
                }}
              >
                {/* Date Box */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '80px',
                    height: '80px',
                    backgroundColor: '#fff8f6',
                    border: '1px solid #f0e0da',
                    borderRadius: '16px',
                    marginRight: '24px',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#1c1917', lineHeight: 1 }}>{dateStr}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#A65D57', marginTop: '4px' }}>{monthStr}</div>
                </div>

                {/* Content */}
                <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: '#1c1917',
                      marginBottom: '8px',
                      lineHeight: 1.2,
                      maxHeight: '58px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {event.title}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', fontSize: '16px', color: '#57534e' }}>
                    <span style={{ fontWeight: 600, color: '#1c1917', marginRight: '12px' }}>
                      {timeStr}
                    </span>
                    <span>
                      {event.location_name || event.venue_name || 'Location TBD'}
                    </span>
                  </div>

                  {/* Categories */}
                  {cats.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginTop: '12px' }}>
                      {cats.map((cat) => (
                        <div
                          key={cat}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#f5f5f4',
                            color: '#57534e',
                            borderRadius: '50px',
                            fontSize: '12px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {cat}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 40px',
          backgroundColor: '#fff8f6',
          borderTop: '1px solid #f0e0da',
          marginTop: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#A65D57',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 900,
              fontSize: '20px',
              marginRight: '12px',
            }}
          >
            F
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 700, color: '#1c1917' }}>Fayetteville Events</div>
            <div style={{ fontSize: '14px', color: '#78716c' }}>Downtown & Fort Bragg Guide</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ fontWeight: 600, color: '#A65D57' }}>ncfayetteville.com</div>
          <div style={{ fontSize: '14px', color: '#78716c' }}>Visit site for full details</div>
        </div>
      </div>
    </div>
  );
};
