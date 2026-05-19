import { Request, Response, NextFunction } from "express";
import { groupService } from "../services/group.service.js";

export async function createGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const group = await groupService.createGroup({
      groupName: req.body.groupName,
      groupAvatar: req.body.groupAvatar,
      adminId: req.userId!,
      participantIds: req.body.participantIds,
    });
    res.status(201).json(group);
  } catch (err) { next(err); }
}

export async function joinGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const conversation = await groupService.joinGroupViaInvite(req.params.inviteCode as string, req.userId!);
    res.json(conversation);
  } catch (err) { next(err); }
}

export async function updateMemberRole(req: Request, res: Response, next: NextFunction) {
  try {
    const member = await groupService.updateMemberRole(
      req.params.conversationId as string, req.userId!, req.body.userId, req.body.role
    );
    res.json(member);
  } catch (err) { next(err); }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    await groupService.removeMember(req.params.conversationId as string, req.userId!, req.params.userId as string);
    res.json({ message: "Member removed" });
  } catch (err) { next(err); }
}

export async function leaveGroup(req: Request, res: Response, next: NextFunction) {
  try {
    await groupService.leaveGroup(req.params.conversationId as string, req.userId!);
    res.json({ message: "Left group" });
  } catch (err) { next(err); }
}

export async function updateGroupInfo(req: Request, res: Response, next: NextFunction) {
  try {
    const conversation = await groupService.updateGroupInfo(req.params.conversationId as string, req.userId!, {
      groupName: req.body.groupName,
      groupAvatar: req.body.groupAvatar,
    });
    res.json(conversation);
  } catch (err) { next(err); }
}

export async function createPoll(req: Request, res: Response, next: NextFunction) {
  try {
    const poll = await groupService.createPoll({
      conversationId: req.body.conversationId,
      userId: req.userId!,
      question: req.body.question,
      options: req.body.options,
      isAnonymous: req.body.isAnonymous,
      isMultipleChoice: req.body.isMultipleChoice,
      expiresInHours: req.body.expiresInHours,
    });
    res.status(201).json(poll);
  } catch (err) { next(err); }
}

export async function votePoll(req: Request, res: Response, next: NextFunction) {
  try {
    const poll = await groupService.votePoll(req.params.pollId as string, req.body.optionId, req.userId!);
    res.json(poll);
  } catch (err) { next(err); }
}
