import { motion } from 'framer-motion';

const Table = ({ headers, data, renderRow, actions, emptyMessage = "No data found" }) => {
    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900/50 border-b border-slate-700 text-gray-400 text-sm uppercase tracking-wider">
                            {headers.map((header, index) => (
                                <th key={index} className="p-4 font-medium">
                                    {header}
                                </th>
                            ))}
                            {actions && <th className="p-4 font-medium text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {data.length > 0 ? (
                            data.map((item, index) => (
                                <motion.tr
                                    key={item._id || index}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="hover:bg-slate-700/30 transition-colors"
                                >
                                    {renderRow(item)}
                                    {actions && (
                                        <td className="p-4 text-right">
                                            {actions(item)}
                                        </td>
                                    )}
                                </motion.tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={headers.length + (actions ? 1 : 0)} className="p-8 text-center text-gray-500">
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Table;
