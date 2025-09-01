import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvitesService } from './invites.service';
import { Invite } from '../entities/invite.entity';
import { WorkspaceMember } from '../entities/workspace_member.entity';

describe('InvitesService', () => {
  let service: InvitesService;
  let invitesRepo: jest.Mocked<Repository<Invite>>;
  let workspaceMembersRepo: jest.Mocked<Repository<WorkspaceMember>>;

  const createRepoMock = <T>() =>
    ({
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    }) as unknown as jest.Mocked<Repository<T>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitesService,
        {
          provide: getRepositoryToken(Invite),
          useValue: createRepoMock<Invite>(),
        },
        {
          provide: getRepositoryToken(WorkspaceMember),
          useValue: createRepoMock<WorkspaceMember>(),
        },
      ],
    }).compile();

    service = module.get(InvitesService);
    invitesRepo = module.get(getRepositoryToken(Invite));
    workspaceMembersRepo = module.get(getRepositoryToken(WorkspaceMember));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create should persist invite', async () => {
    invitesRepo.create.mockReturnValue({} as any);
    invitesRepo.save.mockResolvedValue({ invite_id: 'i1' } as any);

    const res = await service.create({
      tenantId: 't1',
      userId: 'u1',
      dto: {
        email: 'a@b.com',
        resourceType: 'workspace',
        resourceId: 'w1',
        role: 'member',
      },
    });

    expect(invitesRepo.create).toHaveBeenCalled();
    expect(invitesRepo.save).toHaveBeenCalled();
    expect(res).toEqual({ invite_id: 'i1' });
  });

  it('findAll should paginate', async () => {
    invitesRepo.findAndCount.mockResolvedValue([
      [{ invite_id: 'i1' } as any],
      1,
    ]);
    const res = await service.findAll({
      tenantId: 't1',
      query: { offset: 0, limit: 10 },
    });
    expect(res).toEqual({
      invites: [{ invite_id: 'i1' }],
      total: 1,
      offset: 0,
      limit: 10,
    });
  });

  it('findOne should filter by id and tenant', async () => {
    invitesRepo.findOne.mockResolvedValue({ invite_id: 'i1' } as any);
    const res = await service.findOne({ tenantId: 't1', id: 'i1' });
    expect(res).toEqual({ invite_id: 'i1' });
  });

  it('update should save updated invite', async () => {
    invitesRepo.findOne.mockResolvedValue({ invite_id: 'i1' } as any);
    invitesRepo.save.mockResolvedValue({
      invite_id: 'i1',
      role: 'admin',
    } as any);
    const res = await service.update({
      tenantId: 't1',
      userId: 'u1',
      id: 'i1',
      dto: { role: 'admin' },
    });
    expect(res).toEqual({ invite_id: 'i1', role: 'admin' });
  });

  it('remove should delete invite', async () => {
    invitesRepo.findOne.mockResolvedValue({ invite_id: 'i1' } as any);
    const res = await service.remove({
      tenantId: 't1',
      userId: 'u1',
      id: 'i1',
    });
    expect(invitesRepo.remove).toHaveBeenCalled();
    expect(res).toEqual({ deleted: true });
  });

  it('accept should add workspace member and mark accepted', async () => {
    const invite: any = {
      invite_id: 'i1',
      status: 'pending',
      resource_type: 'workspace',
      resource_id: 'w1',
      role: 'member',
    };
    invitesRepo.findOne.mockResolvedValue(invite);
    invitesRepo.save.mockResolvedValue({});
    workspaceMembersRepo.save.mockResolvedValue({});

    const res = await service.accept({
      tenantId: 't1',
      userId: 'u1',
      id: 'i1',
    });

    expect(workspaceMembersRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: 'w1',
        user_id: 'u1',
        role: 'member',
        tenant_id: 't1',
      }),
    );
    expect(invitesRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'accepted',
        accepted_at: expect.any(Date),
      }),
    );
    expect(res).toEqual({ accepted: true });
  });

  it('decline should update status', async () => {
    const invite: any = { invite_id: 'i1', status: 'pending' };
    invitesRepo.findOne.mockResolvedValue(invite);
    invitesRepo.save.mockResolvedValue({});

    const res = await service.decline({
      tenantId: 't1',
      userId: 'u1',
      id: 'i1',
    });

    expect(invitesRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'declined',
        declined_at: expect.any(Date),
      }),
    );
    expect(res).toEqual({ declined: true });
  });
});
