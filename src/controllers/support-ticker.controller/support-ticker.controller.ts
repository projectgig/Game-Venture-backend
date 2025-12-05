import { prisma } from "@game/database/prismaClient";
import { Role, TicketStatus } from "@prisma/client";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export default {
  /**
   * Create a new support ticket
   * @param req
   * @param res
   * @returns
   */
  createTicket: async (req: Request, res: Response) => {
    const { subject, description, priority, parentId, file } = req.body;

    try {
      const user = req.user;

      if (!user) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ message: "Unauthorized" });
      }

      if (!subject || !description || !priority) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Subject, description, and priority are required" });
      }

      if (parentId) {
        const parentTicket = await prisma.supportTicket.findUnique({
          where: { id: parentId },
        });

        if (!parentTicket) {
          return res
            .status(StatusCodes.NOT_FOUND)
            .json({ message: "Parent ticket not found" });
        }

        if (parentTicket.companyId !== user.id) {
          return res
            .status(StatusCodes.FORBIDDEN)
            .json({ message: "Cannot create a ticket for another company" });
        }
      }

      const newTicket = await prisma.supportTicket.create({
        data: {
          subject,
          description,
          priority,
          file: file || null,
          parentId: parentId || null,
          companyId: user.id,
          status: TicketStatus.OPEN,
        },
        include: {
          parent: true,
          company: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      return res.status(StatusCodes.CREATED).json({
        message: "Support ticket created successfully",
        ticket: newTicket,
      });
    } catch (error: any) {
      console.error("Create ticket error:", error);
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to create ticket", error: error.message });
    }
  },

  /**
   * Get all tickets for the authenticated user
   * @param req
   * @param res
   * @returns
   */
  getTickets: async (req: Request, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ message: "Unauthorized" });
      }

      const { status, priority } = req.query;

      const where: any = {};

      if (user.role !== "ADMIN") {
        where.companyId = user.id;
      }

      if (status) {
        where.status = status;
      }
      if (priority) {
        where.priority = priority;
      }

      const tickets = await prisma.supportTicket.findMany({
        where,
        include: {
          parent: true,
          supportTickets: {
            orderBy: { createdAt: "asc" },
          },
          company: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json({
        tickets,
        count: tickets.length,
      });
    } catch (error: any) {
      console.error("Get tickets error:", error);
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to fetch tickets", error: error.message });
    }
  },

  /**
   * Get a specific ticket by ID
   * @param req
   * @param res
   * @returns
   */
  getTicketById: async (req: Request, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ message: "Unauthorized" });
      }

      const ticket = await prisma.supportTicket.findUnique({
        where: { id: req.params.id },
        include: {
          parent: true,
          supportTickets: {
            orderBy: { createdAt: "asc" },
          },
          company: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      if (!ticket) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Ticket not found" });
      }

      const userCompanyId = user.id;
      if (ticket.companyId !== userCompanyId && user.role !== "ADMIN") {
        return res
          .status(StatusCodes.FORBIDDEN)
          .json({ message: "Access denied" });
      }

      return res.json(ticket);
    } catch (error: any) {
      console.error("Get ticket error:", error);
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to fetch ticket", error: error.message });
    }
  },

  /**
   * Update a specific ticket
   * @param req
   * @param res
   * @returns
   */
  updateTicket: async (req: Request, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ message: "Unauthorized" });
      }

      const { subject, description, priority, status, file } = req.body;

      // Find existing ticket
      const existingTicket = await prisma.supportTicket.findUnique({
        where: { id: req.params.id },
      });

      if (!existingTicket) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Ticket not found" });
      }

      // Check authorization
      const userCompanyId = user.id;
      if (existingTicket.companyId !== userCompanyId && user.role !== "ADMIN") {
        return res
          .status(StatusCodes.FORBIDDEN)
          .json({ message: "Access denied" });
      }

      // Build update data
      const updateData: any = {};
      if (subject !== undefined) updateData.subject = subject;
      if (description !== undefined) updateData.description = description;
      if (priority !== undefined) updateData.priority = priority;
      if (status !== undefined) updateData.status = status;
      if (file !== undefined) updateData.file = file;

      const updated = await prisma.supportTicket.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          parent: true,
          supportTickets: true,
          company: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      return res.json({
        message: "Ticket updated successfully",
        ticket: updated,
      });
    } catch (error: any) {
      console.error("Update ticket error:", error);
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to update ticket", error: error.message });
    }
  },

  /**
   * Delete a ticket
   * @param req
   * @param res
   * @returns
   */
  deleteTicket: async (req: Request, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ message: "Unauthorized" });
      }

      const ticket = await prisma.supportTicket.findUnique({
        where: { id: req.params.id },
      });

      if (!ticket) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Ticket not found" });
      }

      const userCompanyId = user.id;
      if (ticket.companyId !== userCompanyId && user.role !== "ADMIN") {
        return res.status(StatusCodes.FORBIDDEN).json({
          message: "Only admins can delete tickets from other companies",
        });
      }

      await prisma.supportTicket.delete({
        where: { id: req.params.id },
      });

      return res.json({
        message: "Ticket deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete ticket error:", error);
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to delete ticket", error: error.message });
    }
  },

  /**
   * Close/resolve a ticket
   * @param req
   * @param res
   * @returns
   */
  closeTicket: async (req: Request, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ message: "Unauthorized" });
      }

      const ticket = await prisma.supportTicket.findUnique({
        where: { id: req.params.id },
      });

      if (!ticket) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Ticket not found" });
      }

      const userCompanyId = user.id;
      if (ticket.companyId !== userCompanyId && user.role !== "ADMIN") {
        return res
          .status(StatusCodes.FORBIDDEN)
          .json({ message: "Access denied" });
      }

      const updated = await prisma.supportTicket.update({
        where: { id: req.params.id },
        data: {
          status: TicketStatus.CLOSED,
        },
      });

      return res.json({
        message: "Ticket closed successfully",
        ticket: updated,
      });
    } catch (error: any) {
      console.error("Close ticket error:", error);
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to close ticket", error: error.message });
    }
  },

  /**
   * Get ticket statistics (Admin/Support only)
   * @param req
   * @param res
   * @returns
   */
  getTicketStats: async (req: Request, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ message: "Unauthorized" });
      }

      if (user.role !== Role.ADMIN) {
        return res.status(StatusCodes.FORBIDDEN).json({
          message: "Only admins and support staff can view statistics",
        });
      }

      const [total, open, inProgress, resolved, closed, byPriority] =
        await Promise.all([
          prisma.supportTicket.count(),
          prisma.supportTicket.count({ where: { status: "OPEN" } }),
          prisma.supportTicket.count({ where: { status: "IN_PROGRESS" } }),
          prisma.supportTicket.count({ where: { status: "RESOLVED" } }),
          prisma.supportTicket.count({ where: { status: "CLOSED" } }),
          prisma.supportTicket.groupBy({
            by: ["priority"],
            _count: true,
          }),
        ]);

      return res.json({
        total,
        byStatus: {
          open,
          inProgress,
          resolved,
          closed,
        },
        byPriority: byPriority.reduce(
          (acc, item) => {
            acc[item.priority] = item._count;
            return acc;
          },
          {} as Record<string, number>
        ),
      });
    } catch (error: any) {
      console.error("Get stats error:", error);
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to fetch statistics", error: error.message });
    }
  },
};
