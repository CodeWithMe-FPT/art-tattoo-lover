import { UserIcon } from '@/assets/icons';
import { roleMap } from '@/features/auth';

import { useAuthStore } from '@/store/authStore';
import { Checkbox, Text, Group, AspectRatio, Image, rem, Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

import {
    ColumnDef,
    useReactTable,
    getCoreRowModel,
    SortingState,
    getSortedRowModel,
    PaginationState,
} from '@tanstack/react-table';
import { useCallback, useMemo, useReducer, useState } from 'react';

import { useGetListUserStudio, useUpdateUserStudioMutation } from '../../api';
import { IUserStudio } from '@/features/studio';
import { toast } from 'react-toastify';
import AddNewUserStudio from '../AddNewUserStudio';
import queryClient from '@/lib/react-query';
import DeleteUserStudio from '../DeleteUserStudio';
import TableForm, { SelectCell } from '@/components/TableForm';

export default function ManageStaffStudio() {
    const { accountType } = useAuthStore();
    const rerender = useReducer(() => ({}), {})[1];
    const refreshData = useCallback(async () => {
        await queryClient.invalidateQueries(['user-studio']);
        setRowSelection({});
    }, []);
    const [opened, { open, close }] = useDisclosure(false);
    const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const defaultData = useMemo(() => [], []);

    const dataQuery = useGetListUserStudio({ page: pageIndex, pageSize, studioId: accountType?.studioId ?? '' });
    const [rowSelection, setRowSelection] = useState({});
    const [sorting, setSorting] = useState<SortingState>([]);

    const updateUserStudioMutation = useUpdateUserStudioMutation({
        onSuccess: () => {
            rerender();
            toast('Cập nhật thành công', { type: 'success' });
            dataQuery.refetch();
        },
        onError: () => {
            toast('Có lỗi xảy ra, vui lòng thử lại sau', { type: 'error' });
        },
    });

    const columns = useMemo<ColumnDef<IUserStudio>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => {
                    return (
                        <Checkbox
                            checked={table.getIsAllRowsSelected()}
                            indeterminate={table.getIsSomeRowsSelected()}
                            onChange={table.getToggleAllRowsSelectedHandler()}
                        />
                    );
                },
                enableSorting: false,
                cell: ({ row }) => {
                    return <Checkbox checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />;
                },
            },
            {
                accessorKey: 'user.fullName',
                header: 'Họ và tên',
                cell: ({ row }) => {
                    return (
                        <Group wrap="nowrap" maw={250}>
                            <AspectRatio miw={rem(36)} mih={rem(36)} className="rounded-full overflow-hidden relative">
                                {row.original.user.avatar ? (
                                    <Image src={row.original.user.avatar} className="object-cover w-full h-full" />
                                ) : (
                                    <div>
                                        <UserIcon styles={{ height: '24px', width: '24px' }} />
                                    </div>
                                )}
                            </AspectRatio>
                            <Text className="text-sm font-semibold w-full">{row.original.user.fullName}</Text>
                        </Group>
                    );
                },
            },
            {
                accessorKey: 'user.email',
                header: 'Địa chỉ Email',
                cell: ({ row }) => {
                    return <Text className="text-sm font-semibold">{row.original.user.email}</Text>;
                },
            },
            {
                accessorKey: 'user.phone',
                header: 'Số điện thoại',
                cell: ({ row }) => {
                    return <Text className="text-sm font-semibold">{row.original.user.phone}</Text>;
                },
            },
            {
                accessorKey: 'user.roleId',
                header: 'Vai trò',
                cell: (cellContext) => {
                    return (
                        <SelectCell
                            cellContext={cellContext}
                            data={Object.entries(roleMap).map(([key, value]) => ({ value: key, label: value }))}
                            onChange={(e, userStudio) => {
                                if (e !== userStudio.user.roleId.toString()) {
                                    updateUserStudioMutation.mutate({
                                        userId: userStudio.id,
                                        roleId: Number(e),
                                    });
                                }
                            }}
                        />
                    );
                },
            },
            {
                accessorKey: 'isDisabled',
                header: 'Trạng thái',
                cell: (cellContext) => {
                    return (
                        <SelectCell
                            cellContext={cellContext}
                            data={[
                                {
                                    label: 'Đã kích hoạt',
                                    value: 'false',
                                },
                                {
                                    label: 'Đã tạm khóa',
                                    value: 'true',
                                },
                            ]}
                            onChange={(e, userStudio) => {
                                if (e !== userStudio.isDisabled.toString()) {
                                    updateUserStudioMutation.mutate({
                                        userId: userStudio.id,
                                        isDisabled: e === 'true',
                                        roleId: userStudio.user.roleId,
                                    });
                                }
                            }}
                        />
                    );
                },
            },
            {
                id: 'action',
                header: 'Thao tác',
                cell: ({ row }) => {
                    return (
                        <Group maw={100}>
                            {accountType?.role && (accountType.role.id === 1 || accountType?.role.id === 2) && (
                                <Button
                                    disabled={accountType?.role && accountType.role.id > 2}
                                    className="text-sm font-semibold cursor-pointer"
                                    onClick={() => console.log(row.original)}
                                >
                                    Sửa
                                </Button>
                            )}
                            <Button
                                color="red.6"
                                className="text-sm font-semibold cursor-pointer"
                                disabled={!row.getIsSelected()}
                                onClick={open}
                            >
                                Xóa
                            </Button>
                        </Group>
                    );
                },
                enableSorting: false,
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [dataQuery.data?.data],
    );

    const table = useReactTable({
        data: dataQuery.data?.data ?? defaultData,
        columns,
        pageCount: dataQuery.data?.total ?? -1,
        state: {
            rowSelection,
            sorting,
        },
        enableRowSelection: true, //enable row selection for all rows
        // enableRowSelection: row => row.original.age > 18, // or enable row selection conditionally per row
        onRowSelectionChange: setRowSelection,
        enableMultiSort: true,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        // getFilteredRowModel: getFilteredRowModel(),
        // getPaginationRowModel: getPaginationRowModel(),
        debugTable: true,
    });

    return (
        <>
            <AddNewUserStudio refreshData={refreshData} />
            <TableForm handlePagination={setPagination} pageIndex={pageIndex} pageSize={pageSize} table={table} />
            <DeleteUserStudio table={table} opened={opened} close={close} refreshData={refreshData} />
        </>
    );
}
