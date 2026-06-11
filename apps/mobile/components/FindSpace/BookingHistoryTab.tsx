import React from 'react';
import {
  View,
  Text,
  ScrollView,
} from 'react-native';
import { Calendar } from 'lucide-react-native';
import { Colors } from '../../theme';
import { styles } from './findSpaceStyles';

interface BookingHistoryTabProps {
  historyBookings: any[];
}

const BookingHistoryTab: React.FC<BookingHistoryTabProps> = ({
  historyBookings,
}) => {
  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionHeading}>Past Reservations</Text>
      {historyBookings.length === 0 ? (
        <View style={styles.emptyTabContent}>
          <Calendar size={56} color={Colors.borderMedium} strokeWidth={1.5} />
          <Text style={styles.emptyStateHeading}>No History Logged</Text>
          <Text style={styles.emptyStateSubtext}>Your completed parking session receipts will display here.</Text>
        </View>
      ) : (
        historyBookings.map((log) => (
          <View key={log.id} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <View>
                <Text style={styles.historySpaceName}>{log.spaceName}</Text>
                <Text style={styles.historyAddress}>{log.address}</Text>
              </View>
              <View style={[
                styles.historyStatusBadge,
                log.status === 'COMPLETED' ? styles.statusBadgeCompleted : styles.statusBadgeCancelled
              ]}>
                <Text style={[
                  styles.historyStatusText,
                  log.status === 'COMPLETED' ? styles.statusTextCompleted : styles.statusTextCancelled
                ]}>
                  {log.status}
                </Text>
              </View>
            </View>

            <View style={styles.historyDivider} />

            <View style={styles.historyDetailsGrid}>
              <View style={styles.historyDetailsCol}>
                <Text style={styles.historyDetailLabel}>Date</Text>
                <Text style={styles.historyDetailValue}>{log.date}</Text>
              </View>
              <View style={styles.historyDetailsCol}>
                <Text style={styles.historyDetailLabel}>Paid Amount</Text>
                <Text style={styles.historyDetailValue}>₹{log.price}</Text>
              </View>
              <View style={styles.historyDetailsCol}>
                <Text style={styles.historyDetailLabel}>Duration</Text>
                <Text style={styles.historyDetailValue}>{log.duration}</Text>
              </View>
            </View>

            {log.status === 'COMPLETED' && (
              <View style={styles.historyFooter}>
                <Text style={styles.historyFooterLabel}>Vehicle: {log.vehiclePlate}</Text>
                <View style={styles.historyStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Text
                      key={star}
                      style={[
                        styles.starChar,
                        star <= (log.rating || 0) ? styles.starCharSelected : styles.starCharEmpty
                      ]}
                    >
                      ★
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
};

export default BookingHistoryTab;
