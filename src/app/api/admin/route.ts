import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { z } from 'zod';

// Helper: verify admin/moderator
async function requireAdmin() {
  const user = await getAuthUser();
  if (!user) {
    return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }), user: null };
  }
  if (!['admin', 'super_admin', 'moderator'].includes(user.role)) {
    return { error: NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 }), user: null };
  }
  return { error: null, user };
}

// Helper: log admin action
async function logAdminAction(adminId: string, targetId: string, targetType: string, action: string, reason: string) {
  await db.adminAction.create({
    data: { adminId, targetId, targetType, action, reason },
  });
}

// Zod schemas
const updateCollegeSchema = z.object({
  action: z.literal('updateCollege'),
  id: z.string().min(1),
  name: z.string().optional(),
  shortName: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  isVerified: z.boolean().optional(),
});

const deleteCollegeSchema = z.object({
  action: z.literal('deleteCollege'),
  id: z.string().min(1),
});

const updateSubjectSchema = z.object({
  action: z.literal('updateSubject'),
  id: z.string().min(1),
  name: z.string().optional(),
  code: z.string().nullable().optional(),
  semester: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
});

const deleteSubjectSchema = z.object({
  action: z.literal('deleteSubject'),
  id: z.string().min(1),
});

const VALID_ROLES = ['student', 'verified_student', 'contributor', 'moderator', 'admin', 'super_admin'] as const;

const updateUserSchema = z.object({
  action: z.literal('updateUser'),
  id: z.string().min(1),
  name: z.string().optional(),
  role: z.enum(VALID_ROLES).optional(),
  isActive: z.boolean().optional(),
});

const resolveReportSchema = z.object({
  action: z.literal('resolveReport'),
  id: z.string().min(1),
  reportAction: z.enum(['resolve', 'dismiss']),
});

const removeNoteSchema = z.object({
  action: z.literal('removeNote'),
  id: z.string().min(1),
  reason: z.string().min(1),
});

const featureNoteSchema = z.object({
  action: z.literal('featureNote'),
  id: z.string().min(1),
});

const listUsersSchema = z.object({
  action: z.literal('listUsers'),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  q: z.string().optional(),
  role: z.string().optional(),
});

const listNotesSchema = z.object({
  action: z.literal('listNotes'),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  status: z.string().optional(),
});

const listReportsSchema = z.object({
  action: z.literal('listReports'),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  status: z.string().optional(),
});

const listCollegesSchema = z.object({
  action: z.literal('listColleges'),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  q: z.string().optional(),
});

const adminActionSchema = z.discriminatedUnion('action', [
  updateCollegeSchema,
  deleteCollegeSchema,
  updateSubjectSchema,
  deleteSubjectSchema,
  updateUserSchema,
  resolveReportSchema,
  removeNoteSchema,
  featureNoteSchema,
  listUsersSchema,
  listNotesSchema,
  listReportsSchema,
  listCollegesSchema,
]);

// GET - Admin dashboard stats
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'super_admin', 'moderator'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all stats in parallel
    const [
      totalUsers,
      totalNotes,
      totalDownloads,
      totalColleges,
      totalSubjects,
      pendingReports,
      totalComments,
      totalRatings,
      totalBookmarks,
      processingNotes,
      flaggedNotes,
      activeUsers,
      newUsersToday,
      newNotesToday,
      notesByType,
      topColleges,
      recentReports,
    ] = await Promise.all([
      // Total users
      db.user.count(),

      // Total notes
      db.note.count(),

      // Total downloads
      db.download.count(),

      // Total colleges
      db.college.count(),

      // Total subjects
      db.subject.count(),

      // Pending reports
      db.report.count({ where: { status: 'pending' } }),

      // Total comments
      db.comment.count({ where: { isDeleted: false } }),

      // Total ratings
      db.rating.count(),

      // Total bookmarks
      db.bookmark.count(),

      // Processing notes
      db.note.count({ where: { status: 'processing' } }),

      // Flagged notes
      db.note.count({ where: { status: 'flagged' } }),

      // Active users (with profile)
      db.profile.count({ where: { contributionScore: { gt: 0 } } }),

      // New users today
      db.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // New notes today
      db.note.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Notes by file type
      db.note.groupBy({
        by: ['fileType'],
        _count: { fileType: true },
        where: { fileType: { not: null } },
      }),

      // Top colleges by notes
      db.college.findMany({
        include: { _count: { select: { notes: true, profiles: true } } },
        orderBy: { notes: { _count: 'desc' } },
        take: 5,
      }),

      // Recent reports
      db.report.findMany({
        where: { status: 'pending' },
        include: {
          reporter: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // User role distribution
    const userRoleDistribution = await db.user.groupBy({
      by: ['role'],
      _count: { role: true },
    });

    // Note status distribution
    const noteStatusDistribution = await db.note.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    // Total downloads via note sum
    const downloadSum = await db.note.aggregate({
      _sum: { downloadCount: true },
    });

    const stats = {
      totalUsers,
      totalNotes,
      totalDownloads: downloadSum._sum.downloadCount || 0,
      totalColleges,
      totalSubjects,
      pendingReports,
      totalComments,
      totalRatings,
      totalBookmarks,
      processingNotes,
      flaggedNotes,
      activeUsers,
      newUsersToday,
      newNotesToday,
      notesByType: notesByType.reduce<Record<string, number>>((acc, item) => {
        if (item.fileType) acc[item.fileType] = item._count.fileType;
        return acc;
      }, {}),
      userRoleDistribution: userRoleDistribution.reduce<Record<string, number>>((acc, item) => {
        acc[item.role] = item._count.role;
        return acc;
      }, {}),
      noteStatusDistribution: noteStatusDistribution.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      topColleges: topColleges.map((c) => ({
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        noteCount: c._count.notes,
        memberCount: c._count.profiles,
      })),
      recentReports: recentReports.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        reason: r.reason,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        reporter: r.reporter,
      })),
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch admin stats' }, { status: 500 });
  }
}

// POST - Admin actions
export async function POST(request: NextRequest) {
  try {
    const { error: authError, user } = await requireAdmin();
    if (authError || !user) return authError;

    const body = await request.json();
    const parsed = adminActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input',
        details: parsed.error.flatten(),
      }, { status: 400 });
    }

    const data = parsed.data;

    switch (data.action) {
      case 'updateCollege': {
        const college = await db.college.findUnique({ where: { id: data.id } });
        if (!college) {
          return NextResponse.json({ success: false, error: 'College not found' }, { status: 404 });
        }

        const updateData: Record<string, unknown> = {};
        if (data.name !== undefined) updateData.name = data.name.trim();
        if (data.shortName !== undefined) updateData.shortName = data.shortName?.trim() || null;
        if (data.city !== undefined) updateData.city = data.city?.trim() || null;
        if (data.state !== undefined) updateData.state = data.state?.trim() || null;
        if (data.country !== undefined) updateData.country = data.country?.trim() || null;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.website !== undefined) updateData.website = data.website?.trim() || null;
        if (data.isVerified !== undefined) updateData.isVerified = data.isVerified;

        const updated = await db.college.update({
          where: { id: data.id },
          data: updateData,
        });

        await logAdminAction(user.id, data.id, 'college', 'updateCollege', `Updated college: ${updated.name}`);
        return NextResponse.json({ success: true, college: updated });
      }

      case 'deleteCollege': {
        const college = await db.college.findUnique({
          where: { id: data.id },
          include: {
            _count: { select: { departments: true, notes: true } },
          },
        });
        if (!college) {
          return NextResponse.json({ success: false, error: 'College not found' }, { status: 404 });
        }

        // Check no departments or notes depend on it
        if (college._count.departments > 0) {
          return NextResponse.json({
            success: false,
            error: `Cannot delete college with ${college._count.departments} departments. Remove or reassign departments first.`,
          }, { status: 400 });
        }
        if (college._count.notes > 0) {
          return NextResponse.json({
            success: false,
            error: `Cannot delete college with ${college._count.notes} notes. Remove or reassign notes first.`,
          }, { status: 400 });
        }

        await db.college.delete({ where: { id: data.id } });
        await logAdminAction(user.id, data.id, 'college', 'deleteCollege', `Deleted college: ${college.name}`);
        return NextResponse.json({ success: true, message: 'College deleted' });
      }

      case 'updateSubject': {
        const subject = await db.subject.findUnique({ where: { id: data.id } });
        if (!subject) {
          return NextResponse.json({ success: false, error: 'Subject not found' }, { status: 404 });
        }

        const updateData: Record<string, unknown> = {};
        if (data.name !== undefined) updateData.name = data.name.trim();
        if (data.code !== undefined) updateData.code = data.code?.trim() || null;
        if (data.semester !== undefined) updateData.semester = data.semester;
        if (data.description !== undefined) updateData.description = data.description?.trim() || null;

        const updated = await db.subject.update({
          where: { id: data.id },
          data: updateData,
        });

        await logAdminAction(user.id, data.id, 'subject', 'updateSubject', `Updated subject: ${updated.name}`);
        return NextResponse.json({ success: true, subject: updated });
      }

      case 'deleteSubject': {
        const subject = await db.subject.findUnique({ where: { id: data.id } });
        if (!subject) {
          return NextResponse.json({ success: false, error: 'Subject not found' }, { status: 404 });
        }

        await db.subject.delete({ where: { id: data.id } });
        await logAdminAction(user.id, data.id, 'subject', 'deleteSubject', `Deleted subject: ${subject.name}`);
        return NextResponse.json({ success: true, message: 'Subject deleted' });
      }

      case 'updateUser': {
        const targetUser = await db.user.findUnique({ where: { id: data.id } });
        if (!targetUser) {
          return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        // Only super_admin can change roles to admin/super_admin
        if ((data.role === 'admin' || data.role === 'super_admin') && user.role !== 'super_admin') {
          return NextResponse.json({ success: false, error: 'Only super admins can assign admin roles' }, { status: 403 });
        }

        // Prevent admins from modifying their own role
        if (data.role !== undefined && data.id === user.id && user.role !== 'super_admin') {
          return NextResponse.json({ success: false, error: 'Cannot modify your own role' }, { status: 403 });
        }

        const updateData: Record<string, unknown> = {};
        if (data.name !== undefined) updateData.name = data.name.trim();
        if (data.role !== undefined) updateData.role = data.role;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        const updated = await db.user.update({
          where: { id: data.id },
          data: updateData,
        });

        const reasonStr = data.isActive === false ? 'Suspended user' : data.role ? `Changed role to ${data.role}` : 'Updated user';
        await logAdminAction(user.id, data.id, 'user', 'updateUser', `${reasonStr}: ${updated.name}`);
        return NextResponse.json({ success: true, user: { id: updated.id, name: updated.name, role: updated.role, isActive: updated.isActive } });
      }

      case 'resolveReport': {
        const report = await db.report.findUnique({ where: { id: data.id } });
        if (!report) {
          return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
        }

        const newStatus = data.reportAction === 'resolve' ? 'resolved' : 'dismissed';
        await db.report.update({
          where: { id: data.id },
          data: { status: newStatus },
        });

        await logAdminAction(user.id, data.id, 'report', 'resolveReport', `Report ${newStatus}: ${report.reason}`);
        return NextResponse.json({ success: true, message: `Report ${newStatus}` });
      }

      case 'removeNote': {
        const note = await db.note.findUnique({ where: { id: data.id } });
        if (!note) {
          return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
        }

        await db.note.update({
          where: { id: data.id },
          data: { status: 'removed' },
        });

        await logAdminAction(user.id, data.id, 'note', 'removeNote', data.reason);

        // Notify the note owner
        await db.notification.create({
          data: {
            userId: note.uploaderId,
            type: 'system',
            title: 'Note Removed',
            message: `Your note "${note.title}" was removed by a moderator. Reason: ${data.reason}`,
          },
        });

        return NextResponse.json({ success: true, message: 'Note removed' });
      }

      case 'featureNote': {
        const note = await db.note.findUnique({ where: { id: data.id } });
        if (!note) {
          return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
        }

        await db.note.update({
          where: { id: data.id },
          data: { qualityScore: { increment: 10 } },
        });

        await logAdminAction(user.id, data.id, 'note', 'featureNote', `Featured note: ${note.title}`);
        return NextResponse.json({ success: true, message: 'Note featured' });
      }

      case 'listUsers': {
        const page = data.page ?? 1;
        const limit = data.limit ?? 10;
        const where: Record<string, unknown> = {};
        if (data.role) where.role = data.role;
        if (data.q) {
          where.OR = [
            { name: { contains: data.q } },
            ...(user.role === 'super_admin' ? [{ email: { contains: data.q } }] : []),
          ];
        }

        // Only super_admin can see email addresses
        const userSelect = {
          id: true, name: true, role: true, avatarUrl: true,
          isActive: true, emailVerified: true, createdAt: true,
          ...(user.role === 'super_admin' ? { email: true } : {}),
          _count: { select: { notes: true } },
        };

        const [users, total] = await Promise.all([
          db.user.findMany({
            where,
            select: userSelect,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          db.user.count({ where }),
        ]);

        return NextResponse.json({ success: true, users, total, page, totalPages: Math.ceil(total / limit) });
      }

      case 'listNotes': {
        const page = data.page ?? 1;
        const limit = data.limit ?? 10;
        const where: Record<string, unknown> = {};
        if (data.status) where.status = data.status;

        const [notes, total] = await Promise.all([
          db.note.findMany({
            where,
            select: {
              id: true, title: true, fileType: true, status: true,
              downloadCount: true, viewCount: true, avgRating: true,
              createdAt: true,
              uploader: { select: { id: true, name: true, avatarUrl: true } },
              subject: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          db.note.count({ where }),
        ]);

        return NextResponse.json({ success: true, notes, total, page, totalPages: Math.ceil(total / limit) });
      }

      case 'listReports': {
        const page = data.page ?? 1;
        const limit = data.limit ?? 10;
        const where: Record<string, unknown> = {};
        if (data.status) where.status = data.status;

        const [reports, total] = await Promise.all([
          db.report.findMany({
            where,
            include: {
              reporter: { select: { id: true, name: true, avatarUrl: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          db.report.count({ where }),
        ]);

        return NextResponse.json({
          success: true,
          reports: reports.map((r) => ({
            id: r.id, targetType: r.targetType, targetId: r.targetId,
            reason: r.reason, description: r.description, status: r.status,
            createdAt: r.createdAt.toISOString(),
            reporter: r.reporter,
          })),
          total, page, totalPages: Math.ceil(total / limit),
        });
      }

      case 'listColleges': {
        const page = data.page ?? 1;
        const limit = data.limit ?? 10;
        const where: Record<string, unknown> = {};
        if (data.q) {
          where.OR = [
            { name: { contains: data.q } },
            { shortName: { contains: data.q } },
          ];
        }

        const [colleges, total] = await Promise.all([
          db.college.findMany({
            where,
            include: {
              _count: { select: { notes: true, profiles: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          db.college.count({ where }),
        ]);

        return NextResponse.json({
          success: true,
          colleges: colleges.map((c) => ({
            id: c.id, name: c.name, shortName: c.shortName,
            city: c.city, state: c.state, country: c.country,
            type: c.type, website: c.website, isVerified: c.isVerified,
            noteCount: c._count.notes, memberCount: c._count.profiles,
          })),
          total, page, totalPages: Math.ceil(total / limit),
        });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin action error:', error);
    return NextResponse.json({ success: false, error: 'Failed to perform admin action' }, { status: 500 });
  }
}
