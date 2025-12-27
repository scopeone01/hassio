import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      redirect: () => {
        const authStore = useAuthStore()
        if (authStore.isAuthenticated) {
          return '/projects'
        }
        return '/login'
      }
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/projects',
      name: 'Projects',
      component: () => import('../views/ProjectsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/projects/:projectId/tickets/new',
      name: 'NewTicket',
      component: () => import('../views/CreateTicketView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/projects/:projectId/tickets',
      name: 'TicketList',
      component: () => import('../views/TicketListView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/projects/:projectId/members',
      name: 'ProjectMembers',
      component: () => import('../views/ProjectMembersView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/project/:projectId/create-ticket',
      name: 'CreateTicket',
      component: () => import('../views/CreateTicketView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/project/:projectId/tickets',
      name: 'TicketList',
      component: () => import('../views/TicketListView.vue'),
      meta: { requiresAuth: true }
    },
    // Settings
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { requiresAuth: true }
    },
    // Admin Routes
    {
      path: '/admin/users',
      name: 'UserManagement',
      component: () => import('../views/Admin/UserManagementView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/projects',
      name: 'ProjectManagement',
      component: () => import('../views/Admin/ProjectManagementView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    }
  ]
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  // Check authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
    return
  }

  // Check admin access
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next('/projects')
    return
  }

  // Redirect authenticated users away from login
  if (to.path === '/login' && authStore.isAuthenticated) {
    next('/projects')
    return
  }

  next()
})

export default router

