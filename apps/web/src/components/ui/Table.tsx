import { ReactNode } from 'react';

/**
 * Lightweight table primitives so admin tables share consistent header/row/cell
 * styling instead of re-declaring `<table className="...">` markup per page.
 *
 * Usage:
 *   <Table headers={['Name', 'Status', '']}>
 *     {rows.map(r => (
 *       <TableRow key={r.id} onClick={() => open(r)}>
 *         <TableCell>{r.name}</TableCell>
 *         <TableCell><Badge .../></TableCell>
 *       </TableRow>
 *     ))}
 *   </Table>
 */
export function Table({ headers, children }: { headers: (string | ReactNode)[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-100">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function TableRow({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-gray-50 ${onClick ? 'hover:bg-gray-50 cursor-pointer' : ''} transition-colors`}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-sm text-gray-700 ${className}`}>{children}</td>;
}
