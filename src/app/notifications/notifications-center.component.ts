import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationItem, NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-notifications-center',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notifications-center.component.html',
  styleUrl: './notifications-center.component.css'
})
export class NotificationsCenterComponent implements OnInit {
  notifications: NotificationItem[] = [];
  loading = false;
  errorMessage = '';
  unreadCount = 0;
  selectedNotificationId: number | null = null;

  constructor(private readonly notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  get selectedNotification(): NotificationItem | null {
    return this.notifications.find((item) => item.id === this.selectedNotificationId) || this.notifications[0] || null;
  }

  loadNotifications(): void {
    this.loading = true;
    this.errorMessage = '';

    this.notificationService.getNotifications().subscribe({
      next: (items) => {
        this.notifications = items;
        this.unreadCount = items.filter((item) => !item.lue).length;
        this.selectedNotificationId = this.selectedNotificationId && items.some((item) => item.id === this.selectedNotificationId)
          ? this.selectedNotificationId
          : items[0]?.id ?? null;
        this.loading = false;
      },
      error: (error: Error) => {
        this.loading = false;
        this.errorMessage = error.message;
      }
    });
  }

  selectNotification(notification: NotificationItem): void {
    this.selectedNotificationId = notification.id;

    if (!notification.lue) {
      this.markAsRead(notification, false);
    }
  }

  markAsRead(notification: NotificationItem, keepSelection = true): void {
    if (notification.lue) {
      if (keepSelection) {
        this.selectedNotificationId = notification.id;
      }
      return;
    }

    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        this.notifications = this.notifications.map((item) =>
          item.id === notification.id ? { ...item, lue: true } : item
        );
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        if (keepSelection) {
          this.selectedNotificationId = notification.id;
        }
      },
      error: () => {
        if (keepSelection) {
          this.selectedNotificationId = notification.id;
        }
      }
    });
  }

  markAllAsRead(): void {
    if (!this.unreadCount) {
      return;
    }

    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map((item) => ({ ...item, lue: true }));
        this.unreadCount = 0;
      },
      error: () => {
        // noop
      }
    });
  }
}
